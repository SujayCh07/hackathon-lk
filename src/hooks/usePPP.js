import { useEffect, useMemo, useState } from 'react';
import supabase, { getPurchasingPowerRatio, getAdjustedPrice, calculateLivingTime } from '../Econ.js';

export function usePPP() {
  const [pppData, setPPPData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPPPData = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('ppp_country')
          .select('country, ppp_index');

        if (error) {
          console.error('Error fetching PPP data:', error);
          setError(error);
          return;
        }

        // Transform data to match the original structure
        const transformedData = {};
        data.forEach(row => {
          if (row.country && row.ppp_index != null) {
            transformedData[row.country] = {
              ppp: row.ppp_index,
              // You may need to add other properties like monthlyCost if they exist in your database
              // or calculate them based on available data
            };
          }
        });

        setPPPData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error in fetchPPPData:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPPPData();
  }, []);

  const cities = useMemo(() => {
    return Object.entries(pppData).map(([country, values]) => ({
      city: country, // Using country as city for consistency with original structure
      country,
      ...values
    }));
  }, [pppData]);

  const adjustPrice = async (amountUSD, fromCountry, toCountry) => {
    try {
      const result = await getAdjustedPrice(fromCountry, toCountry, amountUSD);
      return typeof result === 'number' ? result : amountUSD;
    } catch (error) {
      console.error('Error adjusting price:', error);
      return amountUSD;
    }
  };

  const calculateRunway = async (monthlyBudgetUSD, fromCountry, toCountry, monthlyCostInTargetCountry) => {
    try {
      const result = await calculateLivingTime(fromCountry, toCountry, monthlyBudgetUSD, monthlyCostInTargetCountry);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      console.error('Error calculating runway:', error);
      return 0;
    }
  };

  const calculateRunway = (monthlyBudgetUSD, city) => {
    const entry = pppData[city];
    if (!entry) return 0;
    const adjustedMonthlyCost = entry.monthlyCost * entry.ppp;
    return monthlyBudgetUSD / adjustedMonthlyCost;
  };

  const rankedBySavings = useMemo(() => {
    const atlantaPPP = pppData.Atlanta?.ppp ?? pppData.USA?.ppp ?? 1;
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
    getPPPRatio,
    rankedBySavings,
    isLoading,
    error
  };
}