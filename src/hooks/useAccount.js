import { useCallback, useEffect, useMemo, useState } from 'react';
import { ensureNessieCustomer, loadAccountsFromSupabase, mapAccountRow, syncAccountsFromNessie } from '../lib/nessie.js';
import { useAuth } from './useAuth.js';

export function useAccount() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accounts, setAccounts] = useState([]);
  const [customerId, setCustomerId] = useState(user?.user_metadata?.nessieCustomerId ?? null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCustomerId(user?.user_metadata?.nessieCustomerId ?? null);
  }, [user?.id, user?.user_metadata?.nessieCustomerId]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setAccounts([]);
      setCustomerId(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    loadAccountsFromSupabase(userId)
      .then((rows) => {
        if (!active) return;
        setAccounts(rows.map((row) => mapAccountRow(row)).filter(Boolean));
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        console.warn('Failed to load cached accounts from Supabase', loadError);
        setError(loadError instanceof Error ? loadError : new Error('Unable to load accounts'));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const refresh = useCallback(async ({ forceRefresh = false } = {}) => {
    if (!userId || !user) {
      return [];
    }

    setIsRefreshing(true);
    try {
      let ensuredId = customerId ?? null;
      if (!ensuredId || forceRefresh) {
        const ensured = await ensureNessieCustomer(user, { forceRefresh });
        ensuredId = ensured.customerId;
        setCustomerId(ensuredId);
      }

      const rows = await syncAccountsFromNessie({ userId, customerId: ensuredId });
      const mapped = rows.map((row) => mapAccountRow(row)).filter(Boolean);
      setAccounts(mapped);
      setError(null);
      return mapped;
    } catch (refreshError) {
      console.error('Failed to refresh Nessie accounts', refreshError);
      setError(refreshError instanceof Error ? refreshError : new Error('Unable to refresh accounts'));

      try {
        const cached = await loadAccountsFromSupabase(userId);
        const mapped = cached.map((row) => mapAccountRow(row)).filter(Boolean);
        setAccounts(mapped);
        return mapped;
      } catch (fallbackError) {
        console.warn('Failed to load cached accounts after refresh error', fallbackError);
      }

      return [];
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [customerId, user, userId]);

  const balanceUSD = useMemo(() => {
    return accounts.reduce((total, account) => {
      const balance = Number(account?.balance ?? 0);
      return Number.isFinite(balance) ? total + balance : total;
    }, 0);
  }, [accounts]);

  const primaryAccount = useMemo(() => {
    return accounts[0] ?? null;
  }, [accounts]);

  return {
    accounts,
    account: primaryAccount,
    balanceUSD,
    customerId,
    isLoading,
    isRefreshing,
    error,
    refresh
  };
}
