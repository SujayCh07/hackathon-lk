import { useEffect, useMemo, useState } from 'react';
import transactions from '../data/mockTransactions.json';

export function useTransactions(limit = 5) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setData(transactions);
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
      const key = txn.category;
      acc[key] = (acc[key] ?? 0) + Math.abs(txn.amount);
      return acc;
    }, {});
  }, [data]);

  return {
    transactions: data,
    recent,
    totals,
    isLoading: data.length === 0
  };
}
