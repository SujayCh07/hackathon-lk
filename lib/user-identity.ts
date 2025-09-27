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
