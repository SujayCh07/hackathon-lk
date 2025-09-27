import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

function normaliseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normaliseCity(city) {
  if (!city) {
    return null;
  }

  return {
    code: city.code ?? null,
    name: city.name ?? null,
    flag: city.flag ?? null,
    ppp: normaliseNumber(city.ppp)
  };
}

function normaliseCountry(country) {
  if (!country) {
    return null;
  }

  return {
    code: country.code ?? null,
    name: country.country ?? country.name ?? null
  };
}

function mapProfile(row) {
  if (!row) {
    return null;
  }

  return {
    name: row.name?.trim() || null,
    monthlyBudget: normaliseNumber(row.monthly_budget),
    currentCity: normaliseCity(row.current_city),
    homeCity: normaliseCity(row.home_city),
    currentCountry: normaliseCountry(row.current_country),
    homeCountry: normaliseCountry(row.home_country)
  };
}

export function useUserProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('user_profile')
      .select(
        `
        name,
        monthly_budget,
        current_city:ppp_city!user_profile_current_city_code_fkey(code, name, flag, ppp),
        home_city:ppp_city!user_profile_home_city_code_fkey(code, name, flag, ppp),
        current_country:country_ref!user_profile_current_country_fkey(code, country),
        home_country:country_ref!user_profile_home_country_fkey(code, country)
      `
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapProfile(data);
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
