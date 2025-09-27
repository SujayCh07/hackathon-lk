import { supabase } from './supabase.js';

export const USER_PROFILE_SELECT = `
  user_id,
  name,
  monthly_budget,
  street_address,
  current_city:ppp_city!user_profile_current_city_code_fkey(code, name, flag, ppp),
  home_city:ppp_city!user_profile_home_city_code_fkey(code, name, flag, ppp),
  current_country:country_ref!user_profile_current_country_fkey(code, country),
  home_country:country_ref!user_profile_home_country_fkey(code, country)
`;

function normaliseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normaliseCity(city) {
  if (!city) {
    return null;
  }

  return {
    code: city.code ?? null,
    name: city.name ?? null,
    flag: city.flag ?? null,
    ppp: normaliseNumber(city.ppp)
  };
}

function normaliseCountry(country) {
  if (!country) {
    return null;
  }

  return {
    code: country.code ?? null,
    name: country.country ?? country.name ?? null
  };
}

export function mapUserProfileRow(row) {
  if (!row) {
    return null;
  }

  return {
    name: row.name?.trim() || null,
    monthlyBudget: normaliseNumber(row.monthly_budget),
    currentCity: normaliseCity(row.current_city),
    homeCity: normaliseCity(row.home_city),
    currentCountry: normaliseCountry(row.current_country),
    homeCountry: normaliseCountry(row.home_country),
    streetAddress: row.street_address?.trim() || null
  };
}

export async function fetchUserProfile(userId) {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_profile')
    .select(USER_PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapUserProfileRow(data);
}

export async function upsertUserProfile({
  userId,
  name,
  monthlyBudget,
  streetAddress,
  currentCountryCode,
  homeCountryCode
}) {
  if (!userId) {
    throw new Error('Missing user id for profile update');
  }

  const payload = {
    user_id: userId,
    name: name?.trim() || null,
    monthly_budget:
      typeof monthlyBudget === 'number' && Number.isFinite(monthlyBudget) ? monthlyBudget : null,
    street_address: streetAddress?.trim() || null,
    current_country_code: currentCountryCode || null,
    home_country_code: homeCountryCode || null
  };

  const { data, error } = await supabase
    .from('user_profile')
    .upsert(payload, { onConflict: 'user_id' })
    .select(USER_PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapUserProfileRow(data);
}

export default {
  fetchUserProfile,
  upsertUserProfile,
  mapUserProfileRow
};
