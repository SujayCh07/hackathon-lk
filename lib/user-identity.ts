import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export async function upsertUserRow(params: { id: string; email?: string | null }) {
  if (!params.id) return

  const payload = { id: params.id, email: params.email ?? null }

  try {
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })
    if (error) throw error
  } catch (error) {
    console.warn('Failed to upsert users row', error)
  }
}

export async function upsertUserProfileName(params: { userId: string; displayName: string }) {
  const trimmed = params.displayName?.trim()
  if (!params.userId || !trimmed) return

  const payload = { user_id: params.userId, name: trimmed }

  try {
    const { error } = await supabase.from('user_profile').upsert(payload, { onConflict: 'user_id' })
    if (error) throw error
  } catch (error) {
    console.warn('Failed to upsert user_profile row', error)
  }
}

export async function fetchUserProfileName(userId: string) {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    return data?.name?.trim() ?? null
  } catch (error) {
    console.warn('Failed to fetch user_profile name', error)
    return null
  }
}

export type UserProfileRecord = {
  user_id: string
  name: string | null
  current_city_code: string | null
  home_city_code: string | null
  monthly_budget: number | null
}

export type CityDirectoryEntry = {
  code: string
  name: string
  flag: string | null
}

export async function fetchUserProfile(userId: string) {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('user_id,name,current_city_code,home_city_code,monthly_budget')
      .eq('user_id', userId)
      .maybeSingle<UserProfileRecord>()

    if (error) throw error

    return data ?? null
  } catch (error) {
    console.warn('Failed to fetch user_profile record', error)
    return null
  }
}

export async function fetchCityDirectory() {
  try {
    const { data, error } = await supabase
      .from('ppp_city')
      .select('code,name,flag')
      .order('name', { ascending: true })

    if (error) throw error

    return (Array.isArray(data) ? data : []) as CityDirectoryEntry[]
  } catch (error) {
    console.warn('Failed to fetch PPP city directory', error)
    return []
  }
}

export async function updateUserProfile(params: {
  userId: string
  displayName: string
  currentCityCode?: string | null
  homeCityCode?: string | null
  monthlyBudget?: number | null
}): Promise<{ profile: UserProfileRecord; user: User | null }> {
  const { userId, displayName, currentCityCode, homeCityCode, monthlyBudget } = params

  if (!userId) {
    throw new Error('A userId is required to update profile information')
  }

  await upsertUserRow({ id: userId })

  const trimmedDisplayName = displayName?.trim() ?? null
  const parsedBudget =
    monthlyBudget === null || monthlyBudget === undefined || Number.isNaN(monthlyBudget)
      ? null
      : monthlyBudget

  const payload: UserProfileRecord = {
    user_id: userId,
    name: trimmedDisplayName,
    current_city_code: currentCityCode || null,
    home_city_code: homeCityCode || null,
    monthly_budget: parsedBudget,
  }

  try {
    const { data, error } = await supabase
      .from('user_profile')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle<UserProfileRecord>()

    if (error) throw error

    let updatedUser: User | null = null
    if (trimmedDisplayName) {
      const { data: userData, error: userError } = await supabase.auth.updateUser({
        data: { displayName: trimmedDisplayName },
      })

      if (userError) throw userError

      updatedUser = userData?.user ?? null
    }

    return { profile: data ?? payload, user: updatedUser }
  } catch (error) {
    console.warn('Failed to update user profile', error)
    throw error
  }
}
