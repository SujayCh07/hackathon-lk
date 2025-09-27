import { useEffect, useMemo, useState } from 'react';
import supabase, { 
  getPurchasingPowerRatio, 
  getAdjustedPrice, 
  calculateLivingTime,
  getAllCountriesWithPPP 
} from '../Econ.js';

export function usePPP() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get PPP data
        const countriesWithPPP = await getAllCountriesWithPPP();
        
        if (countriesWithPPP.length === 0) {
          throw new Error('No PPP data available');
        }

        // Transform to match expected structure
        const transformedCountries = countriesWithPPP.map(country => ({
          city: country.originalName, // Using original name for display
          country: country.originalName,
          normalizedName: country.normalizedName,
          ppp: country.ppp_index,
          // Add default monthly cost - you should update this based on your actual data
          monthlyCost: estimateMonthlyLivingCost(country.ppp_index),
          currency: 'USD' // Default currency
        }));

        setCountries(transformedCountries);
        setError(null);
      } catch (err) {
        console.error('Error in usePPP:', err);
        setError(err);
        setCountries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Estimate monthly living cost based on PPP index
  // This is a rough estimation - you should replace with actual data if available
  const estimateMonthlyLivingCost = (pppIndex) => {
    const baseCost = 2000; // Base monthly cost in USD
    return Math.round(baseCost * pppIndex);
  };

  const cities = useMemo(() => countries, [countries]);

  const adjustPrice = async (amountUSD, fromCountry, toCountry) => {
    try {
      console.log(`Adjusting price: $${amountUSD} from ${fromCountry} to ${toCountry}`);
      const result = await getAdjustedPrice(amountUSD, fromCountry, toCountry);
      
      if (typeof result === 'number') {
        console.log(`Adjusted price: $${result.toFixed(2)}`);
        return result;
      } else {
        console.warn(`Price adjustment failed: ${result}`);
        return amountUSD;
      }
    } catch (error) {
      console.error('Error adjusting price:', error);
      return amountUSD;
    }
  };

  const calculateRunway = async (monthlyBudgetUSD, fromCountry, toCountry, monthlyCostInTargetCountry) => {
    try {
      console.log(`Calculating runway: $${monthlyBudgetUSD}/month from ${fromCountry} to ${toCountry}`);
      console.log(`Monthly cost in target: $${monthlyCostInTargetCountry}`);
      
      const result = await calculateLivingTime(fromCountry, toCountry, monthlyBudgetUSD, monthlyCostInTargetCountry);
      
      if (typeof result === 'number') {
        console.log(`Runway calculated: ${result.toFixed(2)} months`);
        return result;
      } else {
        console.warn(`Runway calculation failed: ${result}`);
        return 0;
      }
    } catch (error) {
      console.error('Error calculating runway:', error);
      return 0;
    }
  };

  const getPPPRatio = async (fromCountry, toCountry) => {
    try {
      const result = await getPurchasingPowerRatio(fromCountry, toCountry);
      return typeof result === 'number' ? result : null;
    } catch (error) {
      console.error('Error getting PPP ratio:', error);
      return null;
    }
  };

  const rankedBySavings = useMemo(() => {
    if (countries.length === 0) return [];

    // Find USA/Atlanta as baseline (fallback to first country if not found)
    const baselinePPP = countries.find(c => 
      c.normalizedName === 'usa' || 
      c.city.toLowerCase().includes('usa') ||
      c.city.toLowerCase().includes('atlanta')
    )?.ppp ?? countries[0]?.ppp ?? 1;

    return countries
      .map((country) => {
        // Calculate savings percentage compared to baseline
        // Higher PPP means more expensive, so negative savings
        // Lower PPP means cheaper, so positive savings
        const savings = ((baselinePPP - country.ppp) / baselinePPP) * 100;
        
        return {
          ...country,
          savings: parseFloat(savings.toFixed(2))
        };
      })
      .sort((a, b) => b.savings - a.savings); // Sort by highest savings first
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
    error
  };
}