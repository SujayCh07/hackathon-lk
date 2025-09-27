import { createClient } from '@supabase/supabase-js'

const REACT_APP_SUPABASE_URL="https://ukjadbtyhovuebzqrwbf.supabase.co";
const REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVramFkYnR5aG92dWVienFyd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MjQyNjksImV4cCI6MjA3NDUwMDI2OX0.Wt55LhcGbRvlWrzmfrT_R1CRwR_gnEqwn28MKGC2Sek";

const supabase = createClient(
  REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY
)

// Country name mapping to handle variations
const COUNTRY_ALIASES = {
  'united states': 'usa',
  'us': 'usa',
  'america': 'usa',
  'united states of america': 'usa',
  'uk': 'united kingdom',
  'britain': 'united kingdom',
  'great britain': 'united kingdom'
};

// Normalize country names for consistent matching
function normalizeCountryName(country) {
  if (!country) return '';
  const normalized = country.toLowerCase().trim();
  return COUNTRY_ALIASES[normalized] || normalized;
}

// Cache for PPP data to avoid repeated database calls
let pppCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchPPPData() {
  const now = Date.now();
  
  // Return cached data if it's fresh
  if (pppCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return pppCache;
  }

  try {
    const { data, error } = await supabase
      .from('ppp_country')
      .select('country, ppp_index')
      .not('ppp_index', 'is', null);

    if (error) {
      console.error('Error fetching PPP data:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No PPP data returned from database');
      return {};
    }

    // Transform and normalize data
    const normalizedData = {};
    data.forEach(row => {
      if (row.country && row.ppp_index != null) {
        const normalizedCountry = normalizeCountryName(row.country);
        normalizedData[normalizedCountry] = {
          originalName: row.country,
          ppp_index: parseFloat(row.ppp_index)
        };
      }
    });

    pppCache = normalizedData;
    cacheTimestamp = now;
    
    console.log('PPP data loaded:', Object.keys(normalizedData));
    return normalizedData;
  } catch (error) {
    console.error('Failed to fetch PPP data:', error);
    throw error;
  }
}

/*
 * Get the ratio to multiply money in originalCountry to get equivalent purchasing power in finalCountry
 * Example: getPurchasingPowerRatio('USA', 'Thailand') might return 3.5, 
 * meaning $100 USD has the same purchasing power as $350 in Thailand
 */
export async function getPurchasingPowerRatio(originalCountry, finalCountry) {
  try {
    const pppData = await fetchPPPData();
    
    const normalizedOriginal = normalizeCountryName(originalCountry);
    const normalizedFinal = normalizeCountryName(finalCountry);
    
    console.log(`Looking for PPP ratio: ${normalizedOriginal} -> ${normalizedFinal}`);
    
    const original = pppData[normalizedOriginal];
    const final = pppData[normalizedFinal];

    if (!original) {
      console.warn(`Country not found: ${originalCountry} (normalized: ${normalizedOriginal})`);
      console.log('Available countries:', Object.keys(pppData));
      return "doesn't exist";
    }
    
    if (!final) {
      console.warn(`Country not found: ${finalCountry} (normalized: ${normalizedFinal})`);
      console.log('Available countries:', Object.keys(pppData));
      return "doesn't exist";
    }

    if (original.ppp_index == null || final.ppp_index == null) {
      console.warn('PPP index is null for one of the countries');
      return "doesn't exist";
    }

    // The ratio calculation: higher PPP index means more expensive
    // So to maintain same purchasing power, you need more money in expensive countries
    const ratio = original.ppp_index / final.ppp_index;
    
    console.log(`PPP ratio calculated: ${ratio.toFixed(4)} (${original.ppp_index} -> ${final.ppp_index})`);
    return ratio;
  } catch (error) {
    console.error('Error in getPurchasingPowerRatio:', error);
    return "doesn't exist";
  }
}

/*
 * Adjust a price from one country to another based on PPP
 */
export async function getAdjustedPrice(originalPrice, originalCountry, finalCountry) {
  try {
    const ratio = await getPurchasingPowerRatio(originalCountry, finalCountry);
    if (typeof ratio !== "number") {
      console.warn(`Could not get valid PPP ratio for ${originalCountry} -> ${finalCountry}`);
      return "doesn't exist";
    }
    
    const adjustedPrice = originalPrice * ratio;
    console.log(`Price adjusted: $${originalPrice} (${originalCountry}) -> $${adjustedPrice.toFixed(2)} (${finalCountry})`);
    return adjustedPrice;
  } catch (error) {
    console.error('Error in getAdjustedPrice:', error);
    return "doesn't exist";
  }
}   

/*
 * Calculate how long money will last in a different country
 * @param {string} originalCountry - Country where the money is from
 * @param {string} finalCountry - Country where you want to live
 * @param {number} originalBalance - Amount of money you have
 * @param {number} livingCostPerMonth - Monthly living cost in the final country
 * @returns {number} Number of months the money will last
 */
export async function calculateLivingTime(originalCountry, finalCountry, originalBalance, livingCostPerMonth) {
  try {
    const ratio = await getPurchasingPowerRatio(originalCountry, finalCountry);
    if (typeof ratio !== "number") {
      console.warn(`Could not get valid PPP ratio for living time calculation: ${originalCountry} -> ${finalCountry}`);
      return "doesn't exist";
    }

    const adjustedBalance = originalBalance * ratio;
    const months = adjustedBalance / livingCostPerMonth;
    
    console.log(`Living time calculated: ${months.toFixed(2)} months (${adjustedBalance.toFixed(2)} / ${livingCostPerMonth})`);
    return months;
  } catch (error) {
    console.error('Error in calculateLivingTime:', error);
    return "doesn't exist";
  }
}

/*
 * Get all available countries with their PPP data
 */
export async function getAllCountriesWithPPP() {
  try {
    const pppData = await fetchPPPData();
    return Object.entries(pppData).map(([normalizedName, data]) => ({
      normalizedName,
      originalName: data.originalName,
      ppp_index: data.ppp_index
    }));
  } catch (error) {
    console.error('Error getting all countries:', error);
    return [];
  }
}

/*
 * Clear the PPP data cache (useful for testing or manual refresh)
 */
export function clearPPPCache() {
  pppCache = null;
  cacheTimestamp = null;
}

export default supabase