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
