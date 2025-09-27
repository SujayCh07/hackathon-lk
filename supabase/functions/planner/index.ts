/// <reference types="@supabase/functions-js/edge-runtime.d.ts" />
const j = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  try {
    const headerUserId = req.headers.get("x-user-id") || undefined;
    const { user_id: bodyUserId, monthlyBudget } = await req.json().catch(() => ({}));
    const userId = headerUserId || bodyUserId;
    if (!userId) return j({ error: "Missing user_id" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sFetch = (path: string, qs: string) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}?${qs}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      });

    // Profile
    const prof = await (await sFetch("user_profile", new URLSearchParams({ select:"*", user_id:`eq.${userId}` }).toString())).json();
    const profile = prof[0] ?? null;
    if (!profile) return j({ error: "user_profile missing" }, 400);
    const home = profile.home_country_code || "USA";
    const budget = Number(monthlyBudget ?? profile.monthly_budget ?? 2500);

    // Latest balance
    const acc = (await (await sFetch("accounts",
      new URLSearchParams({ select:"*", user_id:`eq.${userId}`, order:"snapshot_ts.desc", limit:"1" }).toString()
    )).json())[0] ?? null;
    const balance = Number(acc?.balance ?? 0);

    // PPP (normalized view)
    const ppp = await (await sFetch("ppp_country", new URLSearchParams({ select:"code,country,ppp_index" }).toString())).json();
    const homeRow = ppp.find((x:any)=>x.code===home) || { code:"USA", country:"United States", ppp_index:1 };

    const results = ppp
      .filter((x:any) => Number(x.ppp_index) > 0)
      .map((x:any) => {
        const mult = Number(x.ppp_index) / Number(homeRow.ppp_index || 1);
        const monthlyPPP = budget * mult;
        const runway = monthlyPPP > 0 ? balance / monthlyPPP : 0;
        return {
          code: x.code,
          name: x.country,
          costMultiplier: Number(mult.toFixed(3)),
          monthlyPPP: Number(monthlyPPP.toFixed(2)),
          runwayMonths: Number(runway.toFixed(1))
        };
      })
      .sort((a,b) => b.runwayMonths - a.runwayMonths)
      .slice(0, 12);

    const current = profile.current_country_code || home;
    const curRow = ppp.find((x:any)=>x.code===current) || homeRow;
    const curMult = Number(curRow.ppp_index) / Number(homeRow.ppp_index || 1);

    return j({
      balance,
      home: { code: homeRow.code, name: homeRow.country },
      current: { code: curRow.code, name: curRow.country },
      budget,
      best: results[0] || null,
      cities: results
    });
  } catch (e) {
    return j({ error: String(e?.message || e) }, 500);
  }
});
