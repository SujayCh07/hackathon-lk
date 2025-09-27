import { useEffect, useMemo, useState } from 'react';
import rates from '../data/mockFXRates.json';

export function useFX(base = 'USD') {
  const [fxRates, setFxRates] = useState({});

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFxRates(rates[base] ?? {});
    }, 150);

    return () => clearTimeout(timeout);
  }, [base]);

  const convert = (amount, currency) => {
    if (currency === base) return amount;
    const rate = fxRates[currency];
    if (!rate) return amount;
    return amount * rate;
  };

  return {
    base,
    rates: fxRates,
    convert,
    isLoading: Object.keys(fxRates).length === 0
  };
}
