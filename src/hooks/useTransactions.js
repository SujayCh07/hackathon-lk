import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

export function useTransactions(limit = 5) {
  const { nessie, isSyncingNessie } = useAuth();
  const orderedTransactions = useMemo(() => {
    return [...nessie.transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [nessie.transactions]);

  const recent = useMemo(() => {
    return orderedTransactions.slice(0, limit);
  }, [limit, orderedTransactions]);

  const totals = useMemo(() => {
    return orderedTransactions.reduce((acc, txn) => {
      const key = txn.category ?? 'General';
      acc[key] = (acc[key] ?? 0) + Math.abs(Number(txn.amount ?? 0));
      return acc;
    }, {});
  }, [orderedTransactions]);

  return {
    transactions: orderedTransactions,
    recent,
    totals,
    isLoading: isSyncingNessie && orderedTransactions.length === 0
  };
}
