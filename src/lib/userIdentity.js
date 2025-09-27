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
