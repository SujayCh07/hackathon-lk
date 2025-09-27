Deno.env.set("JWT_VERIFICATION", "false");
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type NessieAccount = {
  _id: string;
  type?: string;
  nickname?: string;
  rewards?: number;
  balance: number;
  account_number?: string;
};

type NessiePurchase = {
  _id: string;
  amount: number;
  description?: string;
  status?: string;
  merchant_id?: string;
  purchase_date: string; // YYYY-MM-DD
};

const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const { customer_id, user_id: bodyUserId } = await req.json().catch(() => ({}));
    const headerUserId = req.headers.get("x-user-id") || undefined;
    const userId = headerUserId || bodyUserId; // TEMP for hackathon; replace with auth later

    if (!userId) return j({ error: "Missing user_id (use x-user-id header or JSON)" }, 400);
    if (!customer_id) return j({ error: "Missing customer_id" }, 400);

    const NESSIE_BASE = Deno.env.get("NESSIE_BASE") || "http://api.nessieisreal.com";
    const NESSIE_KEY  = Deno.env.get("NESSIE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!NESSIE_KEY)  return j({ error: "Missing NESSIE_API_KEY" }, 500);
    if (!SUPABASE_URL) return j({ error: "Missing SUPABASE_URL" }, 500);
    if (!SERVICE_KEY)  return j({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);

    const sFetch = (path: string, init: RequestInit) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: "return=representation",
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });

    // 1) Pull accounts
    const accRes = await fetch(`${NESSIE_BASE}/customers/${customer_id}/accounts?key=${NESSIE_KEY}`);
    if (!accRes.ok) return j({ error: "Failed to fetch accounts from Nessie" }, 502);
    const accounts: NessieAccount[] = await accRes.json();

    // 2) Insert an account snapshot for each
    let accountsInserted = 0;
    for (const a of accounts) {
      const masked = a.account_number ? `••••${a.account_number.slice(-4)}` : null;
      const resp = await sFetch("accounts", {
        method: "POST",
        body: JSON.stringify([{
          user_id: userId,
          nessie_account_id: a._id,
          account_type: a.type ?? "Checking",
          account_number_masked: masked,
          currency_code: "USD",
          balance: Number(a.balance ?? 0),
          snapshot_ts: new Date().toISOString(),
        }]),
      });
      if (resp.ok) accountsInserted++;
    }

    // 3) Pull purchases for each account and insert as transactions
    let transactionsInserted = 0;
    for (const a of accounts) {
      const purRes = await fetch(`${NESSIE_BASE}/accounts/${a._id}/purchases?key=${NESSIE_KEY}`);
      if (!purRes.ok) continue;
      const purchases: NessiePurchase[] = await purRes.json();
      if (!Array.isArray(purchases) || purchases.length === 0) continue;

      const rows = purchases.map((p) => ({
        user_id: userId,
        nessie_tx_id: p._id,
        nessie_account_id: a._id,
        ts: new Date(p.purchase_date).toISOString(),
        merchant: p.description || p.merchant_id || "Merchant",
        category: null, // not provided by Nessie; you can backfill later
        currency_code: "USD",
        amount: Math.abs(Number(p.amount ?? 0)), // store spend as positive
      }));

      const resp = await sFetch("transactions", { method: "POST", body: JSON.stringify(rows) });
      if (resp.ok) transactionsInserted += rows.length;
    }

    // 4) Upsert integration link
    await sFetch("user_integrations", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{
        user_id: userId,
        nessie_customer_id: customer_id,
        last_sync: new Date().toISOString(),
      }]),
    });

    return j({
      insertedAccounts: accountsInserted,
      insertedTransactions: transactionsInserted,
      lastSync: new Date().toISOString(),
    });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});
