import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import { supabase } from '../lib/supabase.js';

const COUNTRY_COORDS = {
  bahrain: [26.0667, 50.5577],
  oman: [23.588, 58.3829],
  kuwait: [29.3759, 47.9774],
  portugal: [38.7223, -9.1393],
  mexico: [19.4326, -99.1332],
  thailand: [13.7563, 100.5018],
  france: [48.8566, 2.3522],
  'united states': [38.9072, -77.0369],
  'united arab emirates': [25.2048, 55.2708],
  qatar: [25.2854, 51.5310],
  india: [28.6139, 77.209],
  canada: [45.4215, -75.6972],
};

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(n) ?? 0
  );
}

export function Dashboard() {
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [recent, setRecent] = useState([]);

  // PPP state (kept from your version)
  const [pppTop, setPppTop] = useState([]);
  const [pppMarkers, setPppMarkers] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 1. Get logged-in user
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) return;
      const userId = userRes.user.id;

      // 2. Fetch account balance for this user
      const { data: acctRows, error: acctErr } = await supabase
        .from('accounts')
        .select('balance, currency_code')
        .eq('user_id', userId)
        .order('snapshot_ts', { ascending: false })
        .limit(1);

      if (!acctErr && acctRows?.length > 0) {
        setBalanceUSD(acctRows[0].balance);
      }

      // 3. Fetch recent transactions for this user
      const { data: txRows, error: txErr } = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(10);

      if (!txErr && Array.isArray(txRows)) {
        setRecent(
          txRows.map((t) => ({
            id: t.id,
            merchant: t.merchant,
            amount: t.amount,
            category: t.category ?? 'uncategorized',
            date: t.ts,
          }))
        );
      }

      // 4. PPP logic (kept intact, only runs once for now)
      const { data: prof } = await supabase
        .from('user_profile')
        .select('current_country_code')
        .eq('user_id', userId)
        .maybeSingle();

      const currentCode = (prof?.current_country_code || 'USA').toUpperCase();

      const { data: rows } = await supabase
        .from('ppp_country')
        .select('code, country, 2024_y')
        .not('2024_y', 'is', null)
        .limit(300);

      if (!rows) return;

      const items = rows
        .map((r) => ({
          code: String(r.code || '').toUpperCase(),
          name: String(r.country || '').toLowerCase(),
          ppp: Number(r['2024_y']),
        }))
        .filter((r) => r.ppp > 0);

      const baseline = items.find((r) => r.code === currentCode);
      const baselinePPP = baseline?.ppp ?? 100;

      const enriched = items
        .map((r) => {
          const savings = (baselinePPP - r.ppp) / baselinePPP;
          return {
            city: toTitleCase(r.name),
            ppp: r.ppp,
            savingsPct: Math.max(-1, Math.min(1, savings)),
            coords: COUNTRY_COORDS[r.name] || null,
          };
        })
        .sort((a, b) => b.savingsPct - a.savingsPct);

      if (alive) {
        setPppTop(enriched.slice(0, 3));
        setPppMarkers(
          enriched.filter((e) => Array.isArray(e.coords)).slice(0, 5).map((e) => ({
            city: e.city,
            coords: e.coords,
            ppp: e.ppp,
          }))
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/85">
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-poppins font-semibold text-teal">
              {formatUSD(balanceUSD)}
            </p>
            <p className="mt-2 text-sm text-charcoal/70">
              Capital One demo account synced via Nessie sandbox.
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 bg-white/85">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recent.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-center justify-between rounded-2xl bg-offwhite/80 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{txn.merchant}</p>
                    <p className="text-xs text-charcoal/60">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-coral">{formatUSD(txn.amount)}</p>
                    <p className="text-xs text-charcoal/60">{txn.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP Score map</CardTitle>
            <p className="text-xs text-charcoal/60">
              Leaflet world map placeholder showing PPP hotspots.
            </p>
          </CardHeader>
          <CardContent>
            <WorldMap markers={pppMarkers} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {pppTop.map((dest) => (
            <CityCard
              key={dest.city}
              city={dest.city}
              ppp={dest.ppp}
              savingsPct={dest.savingsPct}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function toTitleCase(s = '') {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

export default Dashboard;
