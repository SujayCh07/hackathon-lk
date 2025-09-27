import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPurchasingPowerRatio,
  getAdjustedPrice,
  calculateBudgetRunway,
  getAllCountries,
} from '../Econ.js';

function estimateMonthlyLivingCost(pppIndex) {
  if (!Number.isFinite(pppIndex) || pppIndex <= 0) {
    return 2000;
  }
  const baseCostUSD = 2000;
  const equivalent = baseCostUSD / pppIndex;
  return Math.max(150, Math.min(8000, Math.round(equivalent)));
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
      acc[country.country] = { ppp: country.ppp };
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
