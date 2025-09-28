import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

function deriveSupabaseAuthStorageKey(url) {
  try {
    const { hostname } = new URL(url);
    const [projectRef] = hostname.split('.');
    if (!projectRef) {
      return null;
    }
    return `sb-${projectRef}-auth-token`;
  } catch (error) {
    console.warn('Failed to derive Supabase auth storage key', error);
    return null;
  }
}

export const supabaseAuthStorageKey = deriveSupabaseAuthStorageKey(supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;
