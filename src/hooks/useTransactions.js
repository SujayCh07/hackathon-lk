import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth.js';
import mockTransactions from '../data/mockTransactions.json';

const USE_MOCK_DATA = false; // ⬅️ Toggle this flag to switch between mock and real data

export function useTransactions(limit = 5) {
  if (USE_MOCK_DATA) {
    const [data, setData] = useState([]);

    useEffect(() => {
      const timeout = setTimeout(() => {
        setData(mockTransactions);
      }, 150);

      return () => clearTimeout(timeout);
    }, []);

    const recent = useMemo(() => {
      return [...data]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    }, [data, limit]);

    const totals = useMemo(() => {
      return data.reduce((acc, txn) => {
        const key = txn.category ?? 'General';
        acc[key] = (acc[key] ?? 0) + Math.abs(txn.amount ?? 0);
        return acc;
      }, {});
    }, [data]);

    return {
      transactions: data,
      recent,
      totals,
      isLoading: data.length === 0,
    };
  }

  // 🔄 Live data version (Nessie)
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
    isLoading: isSyncingNessie && orderedTransactions.length === 0,
  };
}
