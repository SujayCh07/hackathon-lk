import { supabase } from './supabase.js';

export async function fetchRecentNudges(userId, { limit = 8 } = {}) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('nudges')
    .select('id, message, subtitle, category, tone, icon, action_label, action_url, impact, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Failed to fetch stored nudges', error);
    return [];
  }

  return data ?? [];
}

export async function saveNudges(userId, nudges = []) {
  if (!userId || !Array.isArray(nudges) || nudges.length === 0) return [];

  const existing = await fetchRecentNudges(userId, { limit: 24 });
  const existingMessages = new Set(existing.map((entry) => entry.message));

  const rows = nudges
    .filter((nudge) => nudge?.message && !existingMessages.has(nudge.message))
    .map((nudge) => ({
      user_id: userId,
      message: nudge.message,
      subtitle: nudge.subtitle ?? null,
      category: nudge.category ?? null,
      tone: nudge.tone ?? null,
      icon: nudge.icon ?? null,
      action_label: nudge.actionLabel ?? null,
      action_url: nudge.actionHref ?? null,
      impact: typeof nudge.impact === 'number' ? nudge.impact : null,
    }));

  if (rows.length === 0) {
    return existing;
  }

  const { error } = await supabase.from('nudges').insert(rows);
  if (error) {
    console.warn('Failed to persist nudges', error);
    return existing;
  }

  return fetchRecentNudges(userId, { limit: 24 });
}

export function normaliseNudge(row) {
  if (!row) return null;
  return {
    id: row.id ?? null,
    message: row.message ?? '',
    subtitle: row.subtitle ?? null,
    category: row.category ?? null,
    tone: row.tone ?? null,
    icon: row.icon ?? null,
    actionLabel: row.action_label ?? null,
    actionHref: row.action_url ?? null,
    impact: typeof row.impact === 'number' ? row.impact : null,
    createdAt: row.created_at ?? null,
  };
}
