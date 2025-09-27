/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const headerUserId = req.headers.get("x-user-id") || undefined;
    const { user_id: bodyUserId } = await req.json().catch(() => ({}));
    const userId = headerUserId || bodyUserId;
    if (!userId) return j({ error: "Missing user_id (use x-user-id header or JSON)" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sFetch = (path: string, qs: string) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}?${qs}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });

    const accRes = await sFetch("accounts",
      new URLSearchParams({ select:"*", user_id:`eq.${userId}`, order:"snapshot_ts.desc", limit:"1" }).toString()
    );
    const accRows: any[] = await accRes.json();
    const acc = accRows[0] ?? null;

    const txRes = await sFetch("transactions",
      new URLSearchParams({ select:"*", user_id:`eq.${userId}`, order:"ts.desc", limit:"10" }).toString()
    );
    const txRows: any[] = await txRes.json();

    const account = acc ? {
      balance: Number(acc.balance ?? 0),
      accountNumberMasked: acc.account_number_masked,
      accountType: acc.account_type ?? "Checking",
    } : null;

    const transactions = txRows.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      amount: Number(t.amount),
      date: (t.ts || "").slice(0, 10),
      category: t.category
    }));

    return j({ account, transactions });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});
