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

function normaliseArray(value) {
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
      // fall back to comma separated values
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [countriesWithPPP, cityResponse] = await Promise.all([
          getAllCountries(),
          supabase
            .from('ppp_city')
            .select('code, name, country, continent, ppp, monthly_cost_usd, interests, categories, primary_category')
            .limit(500),
        ]);
        if (!active) return;

        if (cityResponse?.error) {
          throw cityResponse.error;
        }

        const cityRows = Array.isArray(cityResponse?.data) ? cityResponse.data : [];

        const countriesLookup = new Map();
        (countriesWithPPP ?? []).forEach((country) => {
          const key = (country.normalizedName ?? country.originalName ?? '').toLowerCase();
          countriesLookup.set(key, country);
        });

        const transformed = (cityRows.length > 0 ? cityRows : countriesWithPPP ?? []).map((entry) => {
          if (cityRows.length === 0) {
            const fallbackPPP = entry.pppIndex ?? 1;
            return {
              city: entry.originalName,
              country: entry.originalName,
              normalizedName: entry.normalizedName,
              ppp: fallbackPPP,
              monthlyCost: estimateMonthlyLivingCost(fallbackPPP),
              currency: 'USD',
              code: entry.isoCode ?? null,
              continent: null,
              interests: [],
              categories: [],
            };
          }

          const normalizedName = (entry.name ?? entry.country ?? '').toLowerCase();
          const matchingCountry =
            countriesLookup.get(normalizedName) || countriesLookup.get((entry.country ?? '').toLowerCase());

          const pppValue = Number(entry.ppp ?? matchingCountry?.pppIndex ?? 1);
          const resolvedPPP = Number.isFinite(pppValue) && pppValue > 0 ? pppValue : 1;

          const baseCost = Number(entry.monthly_cost_usd ?? NaN);
          const resolvedMonthlyCost = Number.isFinite(baseCost) && baseCost > 0
            ? baseCost
            : matchingCountry?.pppIndex
            ? estimateMonthlyLivingCost(matchingCountry.pppIndex)
            : estimateMonthlyLivingCost(resolvedPPP);

          const categories = normaliseArray(entry.categories ?? entry.primary_category);

          return {
            city: entry.name ?? entry.country ?? 'City',
            country: entry.country ?? entry.name ?? 'Unknown',
            normalizedName,
            ppp: resolvedPPP,
            monthlyCost: resolvedMonthlyCost,
            currency: 'USD',
            code: entry.code ?? null,
            continent: entry.continent ?? null,
            interests: normaliseArray(entry.interests),
            categories,
          };
        });

        setCountries(
          transformed.filter((city) => city.city && Number.isFinite(city.ppp) && city.ppp > 0 && Number.isFinite(city.monthlyCost))
        );
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

  const cities = useMemo(() => countries, [countries]);

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
    if (countries.length === 0) return [];
    const baselineCountry = countries.find((entry) => {
      const lower = entry.normalizedName?.toLowerCase?.() ?? entry.city?.toLowerCase?.() ?? '';
      return lower.includes('united states') || lower === 'usa';
    });
    const baselinePPP = baselineCountry?.ppp ?? 1;

    return countries
      .map((country) => {
        const savings = ((baselinePPP - country.ppp) / baselinePPP) * 100;
        return {
          ...country,
          savings: Number.parseFloat(savings.toFixed(2)),
        };
      })
      .sort((a, b) => b.savings - a.savings);
  }, [countries]);

  return {
    ppp: countries.reduce((acc, country) => {
      acc[country.country] = { ppp: country.ppp, interests: country.interests, categories: country.categories };
      return acc;
    }, {}),
    cities,
    countries,
    adjustPrice,
    calculateRunway,
    getPPPRatio,
    rankedBySavings,
    isLoading,
    error,
  };
}

export default usePPP;
