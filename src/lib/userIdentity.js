import { supabase } from './supabase.js';

export async function upsertUserRow({ id, email }) {
  if (!id) {
    return;
  }

  const payload = { id, email: email ?? null };

  try {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Failed to upsert users row', error);
  }
}

export async function upsertUserProfileName({ userId, displayName }) {
  if (!userId || !displayName?.trim()) {
    return;
  }

  const payload = {
    user_id: userId,
    name: displayName.trim()
  };

  try {
    const { error } = await supabase.from('user_profile').upsert(payload, { onConflict: 'user_id' });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Failed to upsert user_profile row', error);
  }
}

export async function fetchUserProfileName(userId) {
  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.name?.trim() ?? null;
  } catch (error) {
    console.warn('Failed to fetch user_profile name', error);
    return null;
  }
}

export async function fetchUserProfile(userId) {
  if (!userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('user_id,name,current_city_code,home_city_code,monthly_budget')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ?? null;
  } catch (error) {
    console.warn('Failed to fetch user_profile record', error);
    return null;
  }
}

export async function fetchCityDirectory() {
  try {
    const { data, error } = await supabase
      .from('ppp_city')
      .select('code,name,flag')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Failed to fetch PPP city directory', error);
    return [];
  }
}

export async function updateUserProfile({
  userId,
  displayName,
  currentCityCode,
  homeCityCode,
  monthlyBudget
}) {
  if (!userId) {
    throw new Error('A userId is required to update profile information');
  }

  await upsertUserRow({ id: userId });

  const trimmedDisplayName = displayName?.trim() ?? null;
  const parsedBudget =
    monthlyBudget === null || monthlyBudget === undefined || monthlyBudget === ''
      ? null
      : Number(monthlyBudget);
  const normalisedBudget =
    parsedBudget === null || Number.isNaN(parsedBudget) ? null : parsedBudget;
  const preparedPayload = {
    user_id: userId,
    name: trimmedDisplayName,
    current_city_code: currentCityCode || null,
    home_city_code: homeCityCode || null,
    monthly_budget: normalisedBudget
  };

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .upsert(preparedPayload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) {
      throw error;
    }

    let updatedUser = null;
    if (trimmedDisplayName) {
      const { data: userData, error: userError } = await supabase.auth.updateUser({
        data: { displayName: trimmedDisplayName }
      });

      if (userError) {
        throw userError;
      }

      updatedUser = userData?.user ?? null;
    }

    return { profile: data ?? preparedPayload, user: updatedUser };
  } catch (error) {
    console.warn('Failed to update user profile', error);
    throw error;
  }
}
