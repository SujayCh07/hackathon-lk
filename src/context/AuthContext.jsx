import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { supabase } from '../lib/supabase.js';
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

const AuthContext = createContext(null);

function getCachedSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return null;
    }

    const projectRef = new URL(supabaseUrl).host.split('.')[0];
    if (!projectRef) {
      return null;
    }

    const stored = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return parsed?.currentSession ?? null;
  } catch (error) {
    console.warn('Failed to read cached Supabase session from storage', error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const cachedSessionRef = useRef(getCachedSession());
  const cachedSession = cachedSessionRef.current;
  const [session, setSession] = useState(cachedSession);
  const [user, setUser] = useState(cachedSession?.user ?? null);
  const [isLoading, setIsLoading] = useState(!cachedSession);
  const [nessieState, setNessieState] = useState(initialNessieState);
  const [isSyncingNessie, setIsSyncingNessie] = useState(false);
  const [authError, setAuthError] = useState(null);
  const activeSessionRef = useRef(cachedSession);

  useEffect(() => {
    activeSessionRef.current = session;
  }, [session]);

  const syncNessie = useCallback(
    async (authUser) => {
      if (!authUser?.id) {
        return;
      }

      const isStale = () => activeSessionRef.current?.user?.id !== authUser.id;
      if (isStale()) {
        return;
      }

      setIsSyncingNessie(true);
      try {
        const userWithIdentity = await ensureUserIdentity(authUser);
        if (isStale()) {
          return;
        }

        const { customerId, user: updatedUser } = await ensureNessieCustomer(userWithIdentity);
        const effectiveUser = updatedUser ?? userWithIdentity;
        if (effectiveUser) {
          if (isStale()) {
            return;
          }
          setUser(effectiveUser);
        }

        await Promise.all([
          syncAccountsFromNessie({ userId: effectiveUser?.id, customerId }),
          syncTransactionsFromNessie({ userId: effectiveUser?.id, customerId })
        ]);

        if (isStale()) {
          return;
        }

        const [accounts, transactions] = await Promise.all([
          loadAccountsFromSupabase(effectiveUser?.id),
          loadTransactionsFromSupabase(effectiveUser?.id)
        ]);

        if (isStale()) {
          return;
        }

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
            if (isStale()) {
              return;
            }

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

        if (isStale()) {
          return;
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

  useEffect(() => {
    let isMounted = true;

    const initialise = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error);
        setIsLoading(false);
        return;
      }

      activeSessionRef.current = data.session ?? null;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setAuthError(null);
      setIsLoading(false);

      if (data.session?.user) {
        await syncNessie(data.session.user);
      }
    };

    if (!cachedSession?.user) {
      setIsLoading(true);
    }

    initialise();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      activeSessionRef.current = nextSession ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthError(null);
      if (nextSession?.user) {
        await syncNessie(nextSession.user);
      } else {
        setNessieState(initialNessieState);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [cachedSession?.user, syncNessie]);

  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
    setNessieState(initialNessieState);
    activeSessionRef.current = null;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error);
        console.error('Failed to sign out from Supabase', error);
      }
    } catch (error) {
      setAuthError(error);
      console.error('Unexpected error during sign out', error);
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
