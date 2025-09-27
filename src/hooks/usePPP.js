import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPurchasingPowerRatio,
  getAdjustedPrice,
  calculateBudgetRunway,
  getAllCountries,
} from '../Econ.js';
import { supabase } from '../lib/supabase.js';

function estimateMonthlyLivingCost(pppIndex) {
  if (!Number.isFinite(pppIndex) || pppIndex <= 0) {
    return 2000;
  }
  const baseCostUSD = 2000;
  const equivalent = baseCostUSD / pppIndex;
  return Math.max(150, Math.min(8000, Math.round(equivalent)));
}

function normaliseTextArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter((entry) => entry.length > 0);
      }
    } catch (error) {
      // fall through to comma split
    }
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

export function usePPP() {
  const [countries, setCountries] = useState([]);
  const [cityDetails, setCityDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const countriesWithPPP = await getAllCountries();
        if (!active) return;

        const transformed = (countriesWithPPP ?? []).map((country) => ({
          city: country.originalName,
          country: country.originalName,
          normalizedName: country.normalizedName,
          ppp: country.pppIndex,
          monthlyCost: estimateMonthlyLivingCost(country.pppIndex),
          currency: 'USD',
          code: country.isoCode ?? null,
        }));

        setCountries(transformed);
        setError(null);
      } catch (cause) {
        if (!active) return;
        console.error('usePPP: failed to load PPP data', cause);
        setCountries([]);
        setError(cause instanceof Error ? cause : new Error('Unable to load PPP data'));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCityMetadata() {
      try {
        const { data, error } = await supabase
          .from('ppp_city')
          .select('code, name, flag, ppp, continent, interests, category_tags');

        if (error) {
          throw error;
        }

        if (!active) return;

        const processed = (data ?? []).map((city) => ({
          code: city.code ?? null,
          city: city.name ?? '',
          country: city.name ?? '',
          normalizedName: city.name?.toLowerCase() ?? '',
          flag: city.flag ?? null,
          ppp: Number(city.ppp ?? 0),
          monthlyCost: estimateMonthlyLivingCost(Number(city.ppp ?? 0)),
          currency: 'USD',
          continent: city.continent ?? null,
          interests: normaliseTextArray(city.interests),
          categoryTags: normaliseTextArray(city.category_tags),
        }));

        setCityDetails(processed);
      } catch (cause) {
        if (!active) return;
        console.warn('usePPP: failed to load PPP city metadata', cause);
        setCityDetails([]);
      }
    }

    loadCityMetadata();

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => {
    if (cityDetails.length > 0) {
      return cityDetails;
    }
    return countries;
  }, [cityDetails, countries]);

  const baselinePPP = useMemo(() => {
    const baseline = countries.find((entry) => {
      const lower = entry.normalizedName?.toLowerCase?.() ?? entry.city?.toLowerCase?.() ?? '';
      return lower.includes('united states') || lower === 'usa';
    });
    return baseline?.ppp ?? 1;
  }, [countries]);

  const adjustPrice = useCallback(async (amountUSD, fromCountry, toCountry) => {
    try {
      const result = await getAdjustedPrice(amountUSD, fromCountry, toCountry);
      return typeof result === 'number' ? result : amountUSD;
    } catch (adjustError) {
      console.error('usePPP: adjustPrice failed', adjustError);
      return amountUSD;
    }
  }, []);

  const calculateRunway = useCallback(async (monthlyBudgetUSD, _fromCountry, toCountry) => {
    try {
      const result = await calculateBudgetRunway(monthlyBudgetUSD, toCountry);
      return typeof result === 'number' ? result : 0;
    } catch (cause) {
      console.error('usePPP: calculateRunway failed', cause);
      return 0;
    }
  }, []);

  const getPPPRatio = useCallback(async (fromCountry, toCountry) => {
    try {
      const result = await getPurchasingPowerRatio(fromCountry, toCountry);
      return typeof result === 'number' ? result : null;
    } catch (cause) {
      console.error('usePPP: getPPPRatio failed', cause);
      return null;
    }
  }, []);

  const rankedBySavings = useMemo(() => {
    if (cities.length === 0) return [];
    const baseline = baselinePPP > 0 ? baselinePPP : 1;

    return cities
      .filter((city) => Number.isFinite(city.ppp) && city.ppp > 0)
      .map((city) => {
        const savings = ((baseline - city.ppp) / baseline) * 100;
        return {
          ...city,
          savings: Number.parseFloat(savings.toFixed(2)),
        };
      })
      .sort((a, b) => b.savings - a.savings);
  }, [cities, baselinePPP]);

  return {
    ppp: cities.reduce((acc, city) => {
      const key = city.country ?? city.city;
      if (key) {
        acc[key] = { ppp: city.ppp };
      }
      return acc;
    }, {}),
    cities,
    countries,
    baselinePPP,
    adjustPrice,
    calculateRunway,
    getPPPRatio,
    rankedBySavings,
    isLoading,
    error,
  };
}

export default usePPP;
