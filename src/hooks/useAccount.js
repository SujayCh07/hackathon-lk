import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

export function useAccount() {
  const { nessie, isSyncingNessie } = useAuth();

  const balanceUSD = useMemo(() => {
    return nessie.accounts.reduce((total, account) => {
      const balance = Number(account.balance ?? 0);
      return Number.isFinite(balance) ? total + balance : total;
    }, 0);
  }, [nessie.accounts]);

  return {
    account: nessie.accounts[0] ?? null,
    accounts: nessie.accounts,
    customerId: nessie.customerId,
    balanceUSD,
    isLoading: isSyncingNessie
  };
}
