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
  };
}
