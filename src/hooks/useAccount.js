import { useEffect, useState } from 'react';
import account from '../data/mockAccount.json';

export function useAccount() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setData(account);
    }, 150);

    return () => clearTimeout(timeout);
  }, []);

  return {
    account: data,
    balanceUSD: data?.balanceUSD ?? 0,
    isLoading: !data
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
