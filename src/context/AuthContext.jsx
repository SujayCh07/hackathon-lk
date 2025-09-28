import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseAuthStorageKey } from '../lib/supabase.js';
import {
  ensureNessieCustomer,
  loadAccountsFromSupabase,
  loadTransactionsFromSupabase,
  mapAccountRow,
  mapTransactionRow,
  syncAccountsFromNessie,
  syncTransactionsFromNessie
} from '../lib/nessie.js';
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

const SESSION_VALIDITY_GRACE_MS = 30 * 1000;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const initialAuthSnapshot = useMemo(() => getInitialAuthSnapshot(), []);
  const [session, setSession] = useState(initialAuthSnapshot.session);
  const [user, setUser] = useState(initialAuthSnapshot.user);
  const [isLoading, setIsLoading] = useState(!initialAuthSnapshot.hydrated);
  const [nessieState, setNessieState] = useState(initialNessieState);
  const [isSyncingNessie, setIsSyncingNessie] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initialise = async () => {
      if (!initialAuthSnapshot.hydrated) {
        setIsLoading(true);
      }

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
        setIsLoading(false);
        clearCachedSupabaseSession();
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

        await Promise.all([
          syncAccountsFromNessie({ userId: effectiveUser?.id, customerId }),
          syncTransactionsFromNessie({ userId: effectiveUser?.id, customerId })
        ]);

        const [accounts, transactions] = await Promise.all([
          loadAccountsFromSupabase(effectiveUser?.id),
          loadTransactionsFromSupabase(effectiveUser?.id)
        ]);

        setNessieState({
          customerId,
          accounts: normaliseAccounts(accounts),
          transactions: normaliseTransactions(transactions)
        });
      } catch (error) {
        console.error('Failed to synchronise Nessie data', error);
        try {
          const [accounts, transactions] = await Promise.all([
            loadAccountsFromSupabase(authUser?.id),
            loadTransactionsFromSupabase(authUser?.id)
          ]);

          if ((accounts?.length ?? 0) > 0 || (transactions?.length ?? 0) > 0) {
            setNessieState({
              customerId: authUser?.user_metadata?.nessieCustomerId ?? null,
              accounts: normaliseAccounts(accounts),
              transactions: normaliseTransactions(transactions)
            });
            return;
          }
        } catch (loadError) {
          console.warn('Failed to load cached Nessie data from Supabase', loadError);
        }

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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase sign-out failed, clearing local state', error);
    } finally {
      setSession(null);
      setUser(null);
      setNessieState(initialNessieState);
      setIsLoading(false);
      clearCachedSupabaseSession();
    }
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

  return accounts
    .map((account) => mapAccountRow(account))
    .filter(Boolean);
}

function normaliseTransactions(transactions) {
  if (!Array.isArray(transactions)) {
    return [];
  }

  return transactions
    .map((transaction) => {
      const mapped = mapTransactionRow(transaction);
      if (!mapped) return null;
      return {
        id: mapped.id,
        merchant: mapped.merchant,
        amount: Math.abs(Number(mapped.amount ?? 0)),
        date: mapped.timestamp,
        category: mapped.category,
        raw: transaction
      };
    })
    .filter(Boolean);
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

function getInitialAuthSnapshot() {
  if (typeof window === 'undefined') {
    return { session: null, user: null, hydrated: false };
  }

  if (!supabaseAuthStorageKey) {
    return { session: null, user: null, hydrated: true };
  }

  try {
    const raw = window.localStorage.getItem(supabaseAuthStorageKey);
    if (!raw) {
      return { session: null, user: null, hydrated: true };
    }

    const parsed = JSON.parse(raw);
    const storedSession = parsed?.currentSession ?? parsed?.session ?? null;
    const storedUser =
      parsed?.currentUser ?? parsed?.user ?? storedSession?.user ?? null;

    if (!isSessionValid(storedSession)) {
      clearCachedSupabaseSession();
      return { session: null, user: null, hydrated: true };
    }

    return {
      session: storedSession,
      user: storedUser ?? null,
      hydrated: true
    };
  } catch (error) {
    console.warn('Failed to read cached Supabase session', error);
    return { session: null, user: null, hydrated: true };
  }
}

function isSessionValid(session) {
  if (!session) {
    return false;
  }

  const rawExpiry = session.expires_at ?? session.expiry_time ?? null;
  if (!rawExpiry) {
    return true;
  }

  const expirySeconds = typeof rawExpiry === 'number' ? rawExpiry : Number(rawExpiry);
  if (Number.isNaN(expirySeconds)) {
    return true;
  }

  const expiryWithGrace = expirySeconds * 1000 - SESSION_VALIDITY_GRACE_MS;
  return expiryWithGrace > Date.now();
}

function clearCachedSupabaseSession() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!supabaseAuthStorageKey) {
    return;
  }

  try {
    window.localStorage.removeItem(supabaseAuthStorageKey);
  } catch (error) {
    console.warn('Failed to clear cached Supabase session', error);
  }
}
