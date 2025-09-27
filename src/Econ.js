import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

export default supabase

export async function getPurchasingPowerRatio(originalCountry, finalCountry) {
  const { data, error } = await supabase
    .from('Purchasing Power Parity Data') // Replace with your actual table name
    .select('country name, 2024_y')

  if (error) {
    console.error('Error fetching data:', error)
    return "doesn't exist"
  }

  // Normalize to lowercase for case-insensitive match
  const normalizedData = data.map(row => ({
    country: row['country name']?.toLowerCase(),
    value: row['2024_y']
  }))

  const original = normalizedData.find(row => row.country === originalCountry.toLowerCase())
  const final = normalizedData.find(row => row.country === finalCountry.toLowerCase())

  if (!original || !final || original.value == null || final.value == null) {
    return "doesn't exist"
  }

  return final.value / original.value
}
