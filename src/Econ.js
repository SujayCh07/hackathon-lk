import { createClient } from '@supabase/supabase-js'

const REACT_APP_SUPABASE_URL="https://ukjadbtyhovuebzqrwbf.supabase.co";
const REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVramFkYnR5aG92dWVienFyd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MjQyNjksImV4cCI6MjA3NDUwMDI2OX0.Wt55LhcGbRvlWrzmfrT_R1CRwR_gnEqwn28MKGC2Sek";

const supabase = createClient(
  REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY
)

// Country name normalization mapping
const COUNTRY_MAPPING = {
  'usa': 'united states',
  'us': 'united states', 
  'america': 'united states',
  'united states of america': 'united states',
  'uk': 'united kingdom',
  'britain': 'united kingdom',
  'great britain': 'united kingdom'
};

function normalizeCountryName(countryName) {
  if (!countryName) return '';
  const normalized = countryName.toLowerCase().trim();
  return COUNTRY_MAPPING[normalized] || normalized;
}

// Cache for database results
let countryDataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchCountryData() {
  const now = Date.now();
  
  if (countryDataCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return countryDataCache;
  }

  try {
    console.log('Fetching PPP data from Supabase...');
    
    const { data, error } = await supabase
      .from('ppp_country')
      .select('country, ppp_index')
      .not('ppp_index', 'is', null);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from database');
    }

    console.log(`Loaded ${data.length} countries from database`);
    
    // Create lookup object with normalized names
    const countryLookup = {};
    data.forEach(row => {
      if (row.country && row.ppp_index !== null) {
        const normalizedName = normalizeCountryName(row.country);
        countryLookup[normalizedName] = {
          originalName: row.country,
          pppIndex: parseFloat(row.ppp_index)
        };
      }
    });

    console.log('Available countries:', Object.keys(countryLookup).sort());
    
    countryDataCache = countryLookup;
    cacheTimestamp = now;
    
    return countryLookup;
  } catch (error) {
    console.error('Failed to fetch country data:', error);
    throw error;
  }
}

/**
 * Calculate purchasing power parity ratio between two countries
 * 
 * PPP Index explanation:
 * - PPP index represents how many local currency units equal $1 USD purchasing power
 * - USA baseline = 1.0
 * - Higher values = more expensive (money doesn't go as far)
 * - Lower values = cheaper (money goes further)
 * 
 * Examples from your data:
 * - USA: 1.0 (baseline)
 * - Afghanistan: 14.801 (much cheaper - your dollars go ~15x further)
 * - Aruba: 1.343 (slightly more expensive - your dollars go less far)
 * 
 * @param {string} fromCountry - Origin country 
 * @param {string} toCountry - Destination country
 * @returns {number|string} Ratio to multiply money by, or "doesn't exist" if error
 */
export async function getPurchasingPowerRatio(fromCountry, toCountry) {
  try {
    const countryData = await fetchCountryData();
    
    const fromNormalized = normalizeCountryName(fromCountry);
    const toNormalized = normalizeCountryName(toCountry);
    
    const fromData = countryData[fromNormalized];
    const toData = countryData[toNormalized];

    if (!fromData) {
      console.warn(`Country not found: "${fromCountry}" (searched as: "${fromNormalized}")`);
      console.log('Available countries:', Object.keys(countryData).sort());
      return "doesn't exist";
    }

    if (!toData) {
      console.warn(`Country not found: "${toCountry}" (searched as: "${toNormalized}")`);
      console.log('Available countries:', Object.keys(countryData).sort());
      return "doesn't exist";
    }

    // Calculate ratio: how much more/less purchasing power you have
    // PPP index = Local Currency Units per $1 USD purchasing power
    // Higher PPP index = cheaper country (your dollars go further)  
    // Lower PPP index = more expensive country (your dollars don't go as far)
    // 
    // Example: USA PPP = 1, India PPP = 25
    // Ratio = 25/1 = 25 (your money goes 25x further in India)
    // 
    // Example: USA PPP = 1, Switzerland PPP = 0.8  
    // Ratio = 0.8/1 = 0.8 (your money goes 20% less far in Switzerland)
    const ratio = toData.pppIndex / fromData.pppIndex;
    
    console.log(`PPP Calculation: ${fromData.originalName} (${fromData.pppIndex}) → ${toData.originalName} (${toData.pppIndex}) = ${ratio.toFixed(4)}x purchasing power`);
    
    return ratio;
  } catch (error) {
    console.error('Error calculating PPP ratio:', error);
    return "doesn't exist";
  }
}

/**
 * Adjust a price from one country to another using PPP
 * Shows what an item that costs X in fromCountry would cost in toCountry
 * 
 * @param {number} price - Original price in fromCountry
 * @param {string} fromCountry - Origin country
 * @param {string} toCountry - Destination country  
 * @returns {number|string} Adjusted price, or "doesn't exist" if error
 */
export async function getAdjustedPrice(price, fromCountry, toCountry) {
  try {
    const ratio = await getPurchasingPowerRatio(fromCountry, toCountry);
    
    if (typeof ratio !== 'number') {
      return "doesn't exist";
    }

    // For price adjustment, we want the inverse ratio
    // If your money goes 2x further, then prices are 0.5x as much
    const adjustedPrice = price / ratio;
    
    console.log(`Price adjustment: $${price} in ${fromCountry} ≈ $${adjustedPrice.toFixed(2)} equivalent in ${toCountry}`);
    
    return adjustedPrice;
  } catch (error) {
    console.error('Error adjusting price:', error);
    return "doesn't exist";
  }
}

/**
 * Calculate how many months your money will last in a different country
 * 
 * @param {string} fromCountry - Country where your money is from
 * @param {string} toCountry - Country where you want to live
 * @param {number} totalMoney - Total amount of money you have
 * @param {number} monthlyExpensesInUSD - Monthly living expenses in USD equivalent
 * @returns {number|string} Number of months money will last, or "doesn't exist" if error
 */
export async function calculateLivingTime(fromCountry, toCountry, totalMoney, monthlyExpensesInUSD) {
  try {
    const ratio = await getPurchasingPowerRatio(fromCountry, toCountry);
    
    if (typeof ratio !== 'number') {
      return "doesn't exist";
    }

    // Your money's purchasing power is multiplied by the ratio
    const adjustedMoney = totalMoney * ratio;
    
    // Monthly expenses should be adjusted to local purchasing power too
    const adjustedMonthlyExpenses = monthlyExpensesInUSD * ratio;
    
    const months = adjustedMoney / adjustedMonthlyExpenses;
    
    console.log(`Living time calculation:`);
    console.log(`- Budget: ${totalMoney} from ${fromCountry}`);
    console.log(`- PPP ratio: ${ratio.toFixed(4)}x`);
    console.log(`- Adjusted budget: ${adjustedMoney.toFixed(2)} purchasing power`);
    console.log(`- Monthly expenses: ${monthlyExpensesInUSD} → ${adjustedMonthlyExpenses.toFixed(2)} adjusted`);
    console.log(`- Result: ${months.toFixed(2)} months`);
    
    return months;
  } catch (error) {
    console.error('Error calculating living time:', error);
    return "doesn't exist";
  }
}

/**
 * Simpler function: Calculate runway based on PPP-adjusted purchasing power
 * This is what the Planner should use
 * 
 * @param {number} monthlyBudgetUSD - Monthly budget in USD
 * @param {string} targetCountry - Country you want to live in  
 * @param {number} baseMonthlyExpensesUSD - Base monthly expenses in USD (e.g., $2000)
 * @returns {number|string} How much longer your budget lasts due to PPP
 */
export async function calculateBudgetRunway(monthlyBudgetUSD, targetCountry, baseMonthlyExpensesUSD = 2000) {
  try {
    // Get PPP ratio from USA to target country
    const ratio = await getPurchasingPowerRatio('united states', targetCountry);
    
    if (typeof ratio !== 'number') {
      return "doesn't exist";
    }

    // Your USD budget's purchasing power in the target country
    const adjustedBudget = monthlyBudgetUSD * ratio;
    
    // How many "months worth" of base expenses this covers
    const monthsOfExpenses = adjustedBudget / baseMonthlyExpensesUSD;
    
    console.log(`Budget runway calculation:`);
    console.log(`- Monthly budget: ${monthlyBudgetUSD} USD`);
    console.log(`- Target country: ${targetCountry}`);
    console.log(`- PPP ratio: ${ratio.toFixed(4)}x`);
    console.log(`- Adjusted purchasing power: ${adjustedBudget.toFixed(2)}`);
    console.log(`- Base expenses: ${baseMonthlyExpensesUSD}`);
    console.log(`- Months of coverage: ${monthsOfExpenses.toFixed(2)}`);
    
    return monthsOfExpenses;
  } catch (error) {
    console.error('Error calculating budget runway:', error);
    return "doesn't exist";
  }
}

/**
 * Get all countries with their PPP data
 * @returns {Array} Array of country objects with PPP data
 */
export async function getAllCountries() {
  try {
    const countryData = await fetchCountryData();
    
    return Object.entries(countryData).map(([normalizedName, data]) => ({
      normalizedName,
      originalName: data.originalName,
      pppIndex: data.pppIndex
    }));
  } catch (error) {
    console.error('Error getting all countries:', error);
    return [];
  }
}

/**
 * Clear the cache (useful for development/testing)
 */
export function clearCache() {
  countryDataCache = null;
  cacheTimestamp = null;
  console.log('PPP data cache cleared');
}

/**
 * Test function to verify calculations are working correctly
 * Run this in browser console: testPPPCalculations()
 */
export async function testPPPCalculations() {
  console.log('\n=== PPP CALCULATION TESTS ===');
  
  try {
    // Test 1: Get available countries
    const countries = await getAllCountries();
    console.log(`\nLoaded ${countries.length} countries`);
    
    // Find some test countries
    const usa = countries.find(c => c.normalizedName.includes('united states'));
    const afghanistan = countries.find(c => c.normalizedName.includes('afghanistan'));
    const aruba = countries.find(c => c.normalizedName.includes('aruba'));
    
    if (!usa) {
      console.error('USA not found in database!');
      return;
    }
    
    console.log(`\nUSA PPP Index: ${usa.pppIndex}`);
    if (afghanistan) console.log(`Afghanistan PPP Index: ${afghanistan.pppIndex}`);
    if (aruba) console.log(`Aruba PPP Index: ${aruba.pppIndex}`);
    
    // Test 2: PPP Ratios
    if (afghanistan) {
      const usaToAfg = await getPurchasingPowerRatio('united states', 'afghanistan');
      console.log(`\nUSA → Afghanistan purchasing power ratio: ${usaToAfg}`);
      console.log(`Your $100 USD has the purchasing power of $${(100 * usaToAfg).toFixed(2)} in Afghanistan`);
    }
    
    if (aruba) {
      const usaToAruba = await getPurchasingPowerRatio('united states', 'aruba');
      console.log(`\nUSA → Aruba purchasing power ratio: ${usaToAruba}`);
      console.log(`Your $100 USD has the purchasing power of $${(100 * usaToAruba).toFixed(2)} in Aruba`);
    }
    
    // Test 3: Price Adjustments
    if (afghanistan) {
      const priceInAfg = await getAdjustedPrice(100, 'united states', 'afghanistan');
      console.log(`\nA $100 item in USA would cost approximately $${typeof priceInAfg === 'number' ? priceInAfg.toFixed(2) : priceInAfg} in Afghanistan`);
    }
    
    // Test 4: Living Time
    if (afghanistan) {
      const months = await calculateLivingTime('united states', 'afghanistan', 10000, 500);
      console.log(`\n$10,000 USD with $500/month expenses in Afghanistan = ${typeof months === 'number' ? months.toFixed(1) : months} months`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  console.log('\n=== END TESTS ===\n');
}

export default supabase