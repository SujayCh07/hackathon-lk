import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ensureNessieCustomer,
  loadTransactionsFromSupabase,
  mapTransactionRow,
  syncTransactionsFromNessie
} from '../lib/nessie.js';
import { useAuth } from './useAuth.js';

const MS_IN_DAY = 1000 * 60 * 60 * 24;

export function useTransactions({ limit = 5, monthlyBudget, balanceUSD } = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setTransactions([]);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    loadTransactionsFromSupabase(userId)
      .then((rows) => {
        if (!active) return;
        setTransactions(rows.map((row) => mapTransactionRow(row)).filter(Boolean));
        setError(null);
      })
      .catch((loadError) => {
        if (!active) return;
        console.warn('Failed to load cached transactions from Supabase', loadError);
        setError(loadError instanceof Error ? loadError : new Error('Unable to load transactions'));
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

  const refresh = useCallback(async () => {
    if (!userId || !user) {
      return [];
    }

    setIsRefreshing(true);
    try {
      const { customerId } = await ensureNessieCustomer(user);
      const rows = await syncTransactionsFromNessie({ userId, customerId });
      const mapped = rows.map((row) => mapTransactionRow(row)).filter(Boolean);
      setTransactions(mapped);
      setError(null);
      return mapped;
    } catch (refreshError) {
      console.error('Failed to refresh Nessie transactions', refreshError);
      setError(refreshError instanceof Error ? refreshError : new Error('Unable to refresh transactions'));

      try {
        const cached = await loadTransactionsFromSupabase(userId);
        const mapped = cached.map((row) => mapTransactionRow(row)).filter(Boolean);
        setTransactions(mapped);
        return mapped;
      } catch (fallbackError) {
        console.warn('Failed to load cached transactions after refresh error', fallbackError);
      }

      return [];
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [user, userId]);

  const orderedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions]);

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

  const spendingMetrics = useMemo(() => {
    if (orderedTransactions.length === 0) {
      return {
        spentLast30: 0,
        averageDailySpend: 0,
        projectedMonthlySpend: 0,
        runwayDays: monthlyBudget ? Infinity : null,
        budgetDelta: monthlyBudget ?? null
      };
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * MS_IN_DAY;

    const recentTxns = orderedTransactions.filter((txn) => new Date(txn.timestamp).getTime() >= thirtyDaysAgo);
    const spentLast30 = recentTxns.reduce((sum, txn) => sum + Math.abs(Number(txn.amount ?? 0)), 0);

    const firstTxnTime = recentTxns.length > 0
      ? Math.min(...recentTxns.map((txn) => new Date(txn.timestamp).getTime()))
      : now;

    const activeDays = Math.max(1, Math.min(30, Math.ceil((now - firstTxnTime) / MS_IN_DAY)));

    const averageDailySpend = spentLast30 / activeDays;
    const projectedMonthlySpend = averageDailySpend * 30;

    const runwayDays = (() => {
      const burnRate = averageDailySpend > 0 ? averageDailySpend : monthlyBudget ? monthlyBudget / 30 : 0;
      if (!burnRate || burnRate <= 0 || !Number.isFinite(balanceUSD)) {
        return null;
      }
      return Math.max(0, Math.floor(balanceUSD / burnRate));
    })();

    const budgetDelta = typeof monthlyBudget === 'number' ? monthlyBudget - projectedMonthlySpend : null;

    return {
      spentLast30,
      averageDailySpend,
      projectedMonthlySpend,
      runwayDays,
      budgetDelta
    };
  }, [orderedTransactions, monthlyBudget, balanceUSD]);

  return {
    transactions: orderedTransactions,
    recent,
    totals,
    spendingMetrics,
    isLoading,
    isRefreshing,
    error,
    refresh
  };
}
