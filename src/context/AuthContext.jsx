import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { ensureNessieCustomer, fetchNessieOverview } from '../lib/nessie.js';
import {
  fetchUserProfileName,
  upsertUserProfileName,
  upsertUserRow
} from '../lib/userIdentity.js';
import mockAccount from '../data/mockAccount.json';
import mockTransactions from '../data/mockTransactions.json';

const initialNessieState = {
  customerId: null,
  accounts: [],
  transactions: []
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nessieState, setNessieState] = useState(initialNessieState);
  const [isSyncingNessie, setIsSyncingNessie] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initialise = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setAuthError(error);
        setIsLoading(false);
        return;
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsLoading(false);

      if (data.session?.user) {
        await syncNessie(data.session.user);
      }
    };

    initialise();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        await syncNessie(nextSession.user);
      } else {
        setNessieState(initialNessieState);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncNessie = useCallback(
    async (authUser) => {
      setIsSyncingNessie(true);
      try {
        const userWithIdentity = await ensureUserIdentity(authUser);
        const { customerId, user: updatedUser } = await ensureNessieCustomer(userWithIdentity);
        const effectiveUser = updatedUser ?? userWithIdentity;
        if (effectiveUser) {
          setUser(effectiveUser);
        }

        const { accounts, transactions } = await fetchNessieOverview(customerId);
        setNessieState({
          customerId,
          accounts: normaliseAccounts(accounts),
          transactions: normaliseTransactions(transactions)
        });
      } catch (error) {
        console.error('Failed to synchronise Nessie data', error);
        setNessieState({
          customerId: authUser?.user_metadata?.nessieCustomerId ?? null,
          accounts: [
            {
              id: 'demo-account',
              name: 'Demo Account',
              balance: Number(mockAccount?.balanceUSD ?? 0),
              currencyCode: 'USD',
              type: 'checking',
              mask: '0000'
            }
          ],
          transactions: normaliseTransactions(mockTransactions ?? [])
        });
      } finally {
        setIsSyncingNessie(false);
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setNessieState(initialNessieState);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      authError,
      nessie: nessieState,
      isSyncingNessie,
      refreshNessie: () => (user ? syncNessie(user) : undefined),
      signOut
    }),
    [authError, isLoading, isSyncingNessie, nessieState, session, signOut, syncNessie, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

function normaliseAccounts(accounts) {
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts.map((account) => ({
    id: account._id ?? account.id,
    name: account.nickname ?? account.name ?? account.type ?? 'Account',
    balance: Number(account.balance ?? account.balanceUSD ?? 0),
    currencyCode: account.currency ?? account.currency_code ?? 'USD',
    type: account.type ?? 'checking',
    mask: account.account_number_masked ?? account.account_number ?? '••••'
  }));
}

function normaliseTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions.map((transaction) => ({
    id: transaction._id ?? transaction.id,
    merchant:
      transaction.payee ??
      transaction.merchant ??
      transaction.description ??
      transaction.purchase_description ??
      'Merchant',
    amount: Math.abs(Number(transaction.amount ?? transaction.purchase_amount ?? 0)),
    date: transaction.transaction_date ?? transaction.date ?? new Date().toISOString(),
    category: Array.isArray(transaction.category)
      ? transaction.category[0]
      : transaction.category ?? transaction.type ?? 'General',
    raw: transaction
  }));
}

async function ensureUserIdentity(authUser) {
  if (!authUser?.id) {
    return authUser;
  }

  await upsertUserRow({ id: authUser.id, email: authUser.email ?? null });

  const metadataName = authUser.user_metadata?.displayName?.trim();
  const profileName = metadataName || (await fetchUserProfileName(authUser.id));
  const derivedName = profileName || authUser.email?.split('@')[0] || null;

  if (derivedName) {
    await upsertUserProfileName({ userId: authUser.id, displayName: derivedName });
  }

  if (!metadataName && derivedName) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          ...(authUser.user_metadata ?? {}),
          displayName: derivedName
        }
      });
      if (error) {
        throw error;
      }
      if (data?.user) {
        return data.user;
      }
    } catch (error) {
      console.warn('Failed to update display name metadata', error);
    }
  }

  return authUser;
}
