import { useEffect, useMemo, useState } from 'react';
import index from '../data/mockPPPIndex.json';

export function usePPP() {
  const [pppData, setPPPData] = useState({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPPPData(index);
    }, 150);

    return () => clearTimeout(timeout);
  }, []);

  const cities = useMemo(() => {
    return Object.entries(pppData).map(([city, values]) => ({
      city,
      ...values
    }));
  }, [pppData]);

  const adjustPrice = (amountUSD, city) => {
    const entry = pppData[city];
    if (!entry) return amountUSD;
    return amountUSD / entry.ppp;
  };

  const calculateRunway = (balanceUSD, city) => {
    const entry = pppData[city];
    if (!entry) return 0;
    const adjustedMonthlyCost = entry.monthlyCost * entry.ppp;
    return balanceUSD / adjustedMonthlyCost;
  };

  const rankedBySavings = useMemo(() => {
    const atlantaPPP = pppData.Atlanta?.ppp ?? 1;
    return cities
      .map((entry) => {
        const savings = ((atlantaPPP - entry.ppp) / atlantaPPP) * 100;
        return {
          ...entry,
          savings
        };
      })
      .sort((a, b) => b.savings - a.savings);
  }, [cities, pppData]);

  return {
    ppp: pppData,
    cities,
    adjustPrice,
    calculateRunway,
    rankedBySavings,
    isLoading: Object.keys(pppData).length === 0
  };
}
