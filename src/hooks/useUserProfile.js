import { useCallback, useEffect, useState } from 'react';
import { fetchUserProfile } from '../lib/userProfile.js';

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return null;
    }

    return fetchUserProfile(userId);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    loadProfile()
      .then((result) => {
        if (!cancelled) {
          setProfile(result);
        }
      })
      .catch((cause) => {
        if (cancelled) return;
        const normalisedError =
          cause instanceof Error ? cause : new Error(typeof cause === 'string' ? cause : 'Failed to load profile');
        setError(normalisedError);
        setProfile(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, loadProfile]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError(null);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await loadProfile();
      setProfile(result);
      return result;
    } catch (cause) {
      const normalisedError =
        cause instanceof Error ? cause : new Error(typeof cause === 'string' ? cause : 'Failed to refresh profile');
      setError(normalisedError);
      setProfile(null);
      throw normalisedError;
    } finally {
      setLoading(false);
    }
  }, [loadProfile, userId]);

  return { profile, loading, error, refresh };
}

export default useUserProfile;
