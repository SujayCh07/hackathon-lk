// Calculate realistic monthly living costs in USD equivalent
  const estimateMonthlyLivingCost = (pppIndex) => {
    // Base comfortable living cost in USD (what $2000 buys in the US)
    const baseComfortableLivingUSD = 2000; 
    
    // In countries with high PPP index (cheap countries), 
    // the same lifestyle costs much less in USD terms
    const equivalentUSDCost = baseComfortableLivingUSD / pppIndex;
    
    // Sanity check: don't let it go below $100 or above $8000
    const clampedCost = Math.max(100, Math.min(8000, equivalentUSDCost));
    
    console.log(`Monthly cost estimate: PPP ${pppIndex} → ${clampedCost.toFixed(0)}/month USD equivalent`);
    
    return Math.round(clampedCost);
  };import { useEffect, useMemo, useState, useCallback } from 'react';
import supabase, { 
  getPurchasingPowerRatio, 
  getAdjustedPrice, 
  calculateLivingTime,
  calculateBudgetRunway,
  getAllCountries 
} from '../Econ.js';

export function usePPP() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('usePPP: Starting data fetch...');
        setIsLoading(true);
        
        // Get PPP data
        const countriesWithPPP = await getAllCountries();
        console.log('usePPP: Received countries:', countriesWithPPP.length);
        
        if (countriesWithPPP.length === 0) {
          throw new Error('No PPP data available');
        }

        // Transform to match expected structure
        const transformedCountries = countriesWithPPP.map(country => ({
          city: country.originalName, // Using original name for display
          country: country.originalName,
          normalizedName: country.normalizedName,
          ppp: country.pppIndex,
          // Add default monthly cost - you should update this based on your actual data
          monthlyCost: estimateMonthlyLivingCost(country.pppIndex),
          currency: 'USD' // Default currency
        }));

        console.log('usePPP: Transformed countries:', transformedCountries.slice(0, 3));
        setCountries(transformedCountries);
        setError(null);
        console.log('usePPP: Data fetch completed successfully');
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
    // Base cost in USD for a comfortable lifestyle
    const baseCostUSD = 2000; 
    // In cheaper countries (high PPP ratio), the USD equivalent is lower
    // In expensive countries (low PPP ratio), the USD equivalent is higher
    return Math.round(baseCostUSD / pppIndex * 1); // Simplified estimation
  };

  const cities = useMemo(() => countries, [countries]);

  const adjustPrice = useCallback(async (amountUSD, fromCountry, toCountry) => {
    try {
      console.log(`Adjusting price: ${amountUSD} from ${fromCountry} to ${toCountry}`);
      const result = await getAdjustedPrice(amountUSD, fromCountry, toCountry);
      
      if (typeof result === 'number') {
        console.log(`Adjusted price: ${result.toFixed(2)}`);
        return result;
      } else {
        console.warn(`Price adjustment failed: ${result}`);
        return amountUSD;
      }
    } catch (error) {
      console.error('Error adjusting price:', error);
      return amountUSD;
    }
  }, []); // No dependencies since it's a pure function


const calculateRunway = useCallback(async (monthlyBudgetUSD, fromCountry, toCountry, monthlyCost) => {
  try {
    const result = await calculateBudgetRunway(monthlyBudgetUSD, toCountry);
    return typeof result === 'number' ? result : 0;
  } catch (err) {
    console.error('calculateRunway failed:', err);
    return 0;
  }
}, []);


  const getPPPRatio = useCallback(async (fromCountry, toCountry) => {
    try {
      const result = await getPurchasingPowerRatio(fromCountry, toCountry);
      return typeof result === 'number' ? result : null;
    } catch (error) {
      console.error('Error getting PPP ratio:', error);
      return null;
    }
  }, []);

  const rankedBySavings = useMemo(() => {
    if (countries.length === 0) {
      console.log('rankedBySavings: No countries available');
      return [];
    }

    // Find USA as baseline (try different variations)
    const baselineCountry = countries.find(c => 
      c.normalizedName === 'united states' || 
      c.city.toLowerCase().includes('united states') ||
      c.city.toLowerCase().includes('usa')
    );
    
    const baselinePPP = baselineCountry?.ppp ?? 1.0;
    console.log('rankedBySavings: Using baseline PPP:', baselinePPP, 'from country:', baselineCountry?.city);

    const ranked = countries
      .map((country) => {
        // Calculate savings percentage compared to baseline
        // Lower PPP means cheaper, so positive savings
        // Higher PPP means more expensive, so negative savings
        const savings = ((baselinePPP - country.ppp) / baselinePPP) * 100;
        
        return {
          ...country,
          savings: parseFloat(savings.toFixed(2))
        };
      })
      .sort((a, b) => b.savings - a.savings); // Sort by highest savings first
      
    console.log('rankedBySavings: Top 3 countries by savings:', ranked.slice(0, 3).map(c => ({
      city: c.city,
      ppp: c.ppp,
      savings: c.savings
    })));

    return ranked;
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