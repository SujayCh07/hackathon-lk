/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const CATS = ['Groceries','Rent','Transport','Dining','Travel','Entertainment','Utilities','Healthcare','Education','Other'] as const;
type Cat = typeof CATS[number];

function bucket(merchant: string): Cat {
  const m = merchant.toLowerCase();
  if (m.includes('rent') || m.includes('loft') || m.includes('apt')) return 'Rent';
  if (m.includes('uber') || m.includes('lyft') || m.includes('marta') || m.includes('bus') || m.includes('metro') || m.includes('train')) return 'Transport';
  if (m.includes('market') || m.includes('grocery') || m.includes('publix') || m.includes('whole foods')) return 'Groceries';
  if (m.includes('cafe') || m.includes('coffee') || m.includes('restaurant') || m.includes('diner') || m.includes('pizza')) return 'Dining';
  if (m.includes('airlines') || m.includes('delta') || m.includes('hotel') || m.includes('airport')) return 'Travel';
  if (m.includes('cinema') || m.includes('theater') || m.includes('netflix') || m.includes('concert')) return 'Entertainment';
  if (m.includes('utility') || m.includes('electric') || m.includes('water') || m.includes('gas co')) return 'Utilities';
  if (m.includes('clinic') || m.includes('pharmacy') || m.includes('hospital')) return 'Healthcare';
  if (m.includes('school') || m.includes('university') || m.includes('udemy')) return 'Education';
  return 'Other';
}

Deno.serve(async (req) => {
  try {
    const headerUserId = req.headers.get("x-user-id") || undefined;
    const { user_id: bodyUserId } = await req.json().catch(() => ({}));
    const userId = headerUserId || bodyUserId;
    if (!userId) return j({ error: "Missing user_id" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sFetch = (path: string, qs: string) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}?${qs}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });

    // profile + PPP view + (optional) per-category overrides
    const profile = (await (await sFetch("user_profile", new URLSearchParams({ select:"*", user_id:`eq.${userId}` }).toString())).json())[0] ?? null;
    const home = profile?.home_country_code || 'USA';

    const ppp = await (await sFetch("ppp_country", new URLSearchParams({ select:"code,country,ppp_index" }).toString())).json();
    const overrides = await (await sFetch("ppp_category_multiplier", new URLSearchParams({ select:"code,category,multiplier" }).toString())).json();

    const homeRow = ppp.find((x:any)=>x.code===home) || { code:'USA', country:'United States', ppp_index:1 };

    // 30d spend
    const from = new Date(Date.now() - 30*24*3600*1000).toISOString();
    const txs: any[] = await (await sFetch("transactions",
      new URLSearchParams({ select:"*", user_id:`eq.${userId}`, ts:`gte.${from}` }).toString()
    )).json();

    // bucket at home
    const spendHome: Record<Cat, number> = Object.fromEntries(CATS.map(c => [c,0])) as any;
    for (const t of txs) {
      const cat = bucket(String(t.merchant||''));
      spendHome[cat] += Number(t.amount||0);
    }

    // compare across a few destinations
    const sample = ppp.slice(0, 6);
    const comparisons = sample.map((row:any) => {
      const baseMult = Number(row.ppp_index) / Number(homeRow.ppp_index || 1);
      const catMap = new Map<string, number>();
      for (const r of overrides) if (r.code === row.code) catMap.set(String(r.category), Number(r.multiplier));

      const adjusted: Record<Cat, number> = {} as any;
      let total = 0;
      for (const c of CATS) {
        const m = catMap.get(c) ?? baseMult;
        const v = spendHome[c] * m;
        adjusted[c] = Number(v.toFixed(2));
        total += v;
      }
      return { code: row.code, name: row.country, adjusted: { ...adjusted, total: Number(total.toFixed(2)) } };
    });

    return j({ windowDays: 30, home: { code: homeRow.code, name: homeRow.country }, spendHome, comparisons });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});
