import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadPersonalization, markOnboardingComplete, savePersonalization } from '../lib/personalization.js';

const EMPTY_PAYLOAD = {
  travelGoal: null,
  travelStyle: null,
  budgetFocus: null,
  monthlyBudget: null,
  curiousCities: [],
  onboardingComplete: false,
};

export function usePersonalization(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setData(null);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    loadPersonalization(userId)
      .then((payload) => {
        if (!active) return;
        setData(payload ? { ...EMPTY_PAYLOAD, ...payload } : { ...EMPTY_PAYLOAD });
      })
      .catch((cause) => {
        if (!active) return;
        console.warn('Unable to fetch personalization', cause);
        setError(cause instanceof Error ? cause : new Error('Unable to load preferences'));
        setData({ ...EMPTY_PAYLOAD });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(
    async (partial) => {
      if (!userId) return null;
      const next = { ...EMPTY_PAYLOAD, ...(data ?? EMPTY_PAYLOAD), ...partial };
      try {
        const persisted = await savePersonalization(userId, next);
        setData({ ...EMPTY_PAYLOAD, ...persisted });
        setError(null);
        return persisted;
      } catch (persistError) {
        console.error('Failed to save personalization', persistError);
        setError(persistError instanceof Error ? persistError : new Error('Unable to save preferences'));
        const optimistic = { ...EMPTY_PAYLOAD, ...next };
        setData(optimistic);
        return optimistic;
      }
    },
    [data, userId]
  );

  const completeOnboarding = useCallback(
    async (partial = {}) => {
      if (!userId) return null;
      const next = { ...EMPTY_PAYLOAD, ...(data ?? EMPTY_PAYLOAD), ...partial, onboardingComplete: true };
      try {
        const persisted = await markOnboardingComplete(userId, next);
        setData({ ...EMPTY_PAYLOAD, ...persisted, onboardingComplete: true });
        setError(null);
        return persisted;
      } catch (cause) {
        console.error('Failed to complete onboarding', cause);
        setError(cause instanceof Error ? cause : new Error('Unable to complete onboarding'));
        setData(next);
        return next;
      }
    },
    [data, userId]
  );

  const value = useMemo(() => {
    return {
      ...EMPTY_PAYLOAD,
      ...(data ?? {}),
    };
  }, [data]);

  return {
    data: value,
    loading,
    error,
    save,
    completeOnboarding,
  };
}

export default usePersonalization;
