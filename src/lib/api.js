import { supabase } from './supabase.js';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callFunction(name, { userId, body } = {}) {
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess?.session?.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${name} ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function syncNessie() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not signed in');

  // fetch mapped Nessie customer_id from user_integrations
  const { data, error } = await supabase
    .from('user_integrations')
    .select('nessie_customer_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const customerId = data?.nessie_customer_id;
  if (!customerId) throw new Error('No Nessie customer linked. Run an initial sync with customer_id.');

  return callFunction('nessie-sync', { userId, body: { customer_id: customerId } });
}
