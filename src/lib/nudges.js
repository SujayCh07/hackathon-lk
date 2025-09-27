import { supabase } from './supabase.js';

function normaliseNudge(nudge) {
  if (!nudge) return null;
  return {
    slug: nudge.slug ?? null,
    title: nudge.title ?? null,
    message: nudge.message ?? null,
    variant: nudge.variant ?? 'info',
    icon: nudge.icon ?? 'sparkles',
    action_label: nudge.actionLabel ?? null,
    action_href: nudge.actionHref ?? null,
  };
}

export async function fetchRecentNudges(userId, { limit = 10 } = {}) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('user_nudges')
    .select('slug, title, message, variant, icon, action_label, action_href')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Failed to load nudges', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug ?? null,
    title: row.title ?? null,
    message: row.message ?? null,
    variant: row.variant ?? 'info',
    icon: row.icon ?? 'sparkles',
    actionLabel: row.action_label ?? null,
    actionHref: row.action_href ?? null,
  }));
}

export async function upsertNudges(userId, nudges = []) {
  if (!userId || !Array.isArray(nudges) || nudges.length === 0) {
    return [];
  }

  const payload = nudges
    .map((nudge) => normaliseNudge(nudge))
    .filter((n) => n && n.slug && n.message);

  if (payload.length === 0) {
    return [];
  }

  const rows = payload.map((nudge) => ({
    user_id: userId,
    slug: nudge.slug,
    title: nudge.title,
    message: nudge.message,
    variant: nudge.variant,
    icon: nudge.icon,
    action_label: nudge.action_label,
    action_href: nudge.action_href,
  }));

  const { data, error } = await supabase
    .from('user_nudges')
    .upsert(rows, { onConflict: 'user_id,slug' })
    .select();

  if (error) {
    console.warn('Failed to persist nudges', error);
    return payload.map((nudge) => ({
      slug: nudge.slug,
      title: nudge.title,
      message: nudge.message,
      variant: nudge.variant,
      icon: nudge.icon,
      actionLabel: nudge.action_label,
      actionHref: nudge.action_href,
    }));
  }

  return (data ?? rows).map((row) => ({
    slug: row.slug,
    title: row.title,
    message: row.message,
    variant: row.variant,
    icon: row.icon,
    actionLabel: row.action_label ?? row.actionLabel ?? null,
    actionHref: row.action_href ?? row.actionHref ?? null,
  }));
}
