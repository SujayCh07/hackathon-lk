import { createClient } from '@supabase/supabase-js'

const REACT_APP_SUPABASE_URL="https://ukjadbtyhovuebzqrwbf.supabase.co";
const REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVramFkYnR5aG92dWVienFyd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MjQyNjksImV4cCI6MjA3NDUwMDI2OX0.Wt55LhcGbRvlWrzmfrT_R1CRwR_gnEqwn28MKGC2Sek";

const supabase = createClient(
  REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY
)

/*
Multiply money in Country 1 by the number returned by this function
*/

export default supabase

export async function getPurchasingPowerRatio(originalCountry, finalCountry) {
  const { data, error } = await supabase
    .from('ppp_country') // Replace with your actual table name
    .select('country, ppp_index')

  if (error) {
    console.error('Error fetching data:', error.message)
    return "doesn't exist"
  }

  // Normalize to lowercase for case-insensitive match
  const normalizedData = data.map(row => ({
    country: row['country']?.toLowerCase(),
    value: row['ppp_index']
  }))

  const original = normalizedData.find(row => row.country === originalCountry.toLowerCase())
  // console.log(originalCountry);
  // console.log(finalCountry); 
  const final = normalizedData.find(row => row.country === finalCountry.toLowerCase())

  if (!original || !final || original.value == null || final.value == null) {
    return "doesn't exist"
  }

  return final.value / original.value
}

export async function getAdjustedPrice(originalPrice, originalCountry, finalCountry) {
  const ratio = await getPurchasingPowerRatio(originalCountry, finalCountry)
  if (typeof ratio !== "number") {
    return "doesn't exist"
  }
  return originalPrice * ratio
}   

export async function calculateLivingTime(originalCountry, finalCountry, originalBalance, livingCostPerMonth) {
    const ratio = await getPurchasingPowerRatio(originalCountry, finalCountry)
    if (typeof ratio !== "number") {
        return "doesn't exist"
    }

    const adjustedBalance = originalBalance * ratio
    return adjustedBalance / livingCostPerMonth
}