import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nessie-admin`;

export default function DemoAdminStatus() {
  const [result, setResult] = useState({ info: 'Idle' });
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    setLoading(true);
    setResult({ info: 'Checking…' });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      setResult({ error: 'No logged-in user' });
      setLoading(false);
      return;
    }

    try {
      // This function expects an `action`, not a sub-path:
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'whoami', user_id: data.user.id, debug: 1 })
      });
      setResult(await r.json());
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-6 text-4xl font-bold text-navy">Admin status (private)</h1>
      <button
        onClick={handleCheck}
        disabled={loading}
        className="rounded-2xl bg-navy px-5 py-2 text-white disabled:opacity-60"
      >
        {loading ? 'Checking…' : 'Check'}
      </button>
      <pre className="mt-6 rounded-2xl bg-black/5 p-4 text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    </main>
  );
}
