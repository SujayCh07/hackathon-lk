// src/pages/Dashboard.jsx
import { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { supabase } from '../lib/supabase.js';

const ACCT_LS_KEY = 'parity:selectedAccountId';
const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

function toTitleCase(s = '') {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function groupByWeek(transactions) {
  if (!Array.isArray(transactions)) return [];
  const map = new Map();
  for (const t of transactions) {
    const ts = new Date(t.timestamp ?? t.ts ?? t.date ?? Date.now());
    if (Number.isNaN(ts.getTime())) continue;
    const d = new Date(ts);
    const w = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    d.setDate(w); d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    map.set(key, { key, label, date: d, amount: (map.get(key)?.amount || 0) + Math.abs(Number(t.amount || 0)) });
  }
  return [...map.values()].sort((a, b) => a.date - b.date);
}

async function getCountryCoords(countryName) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=json&limit=1`
    );
    const j = await r.json();
    if (Array.isArray(j) && j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
  } catch {}
  return null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  // identity/budget
  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName?.trim()) return md.displayName.trim();
    if (user.email) return user.email.split('@')[0] ?? '';
    return '';
  }, [user]);
  const displayName = profile?.name ?? identityFallback;
  const baseMonthlyBudget = useMemo(() => {
    if (profile?.monthly_budget) return profile.monthly_budget;
    return 2500;
  }, [profile?.monthly_budget]);

  // ── Accounts & selection ───────────────────────────────────────────────────
  const [accounts, setAccounts] = useState([]); // [{ id, type, balance, nickname, snapshot_ts }]
  const [selectedId, setSelectedId] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [balanceUSD, setBalanceUSD] = useState(0);

  // recent tx for selected account (rendered after load)
  const [recent, setRecent] = useState([]);
  // 90-day tx for trends (all accounts)
  const [trendTx, setTrendTx] = useState([]);

  // Load accounts (prefer nickname if column exists)
  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
      let rows = null;
      let error = null;

      // Try with nickname present
      ({ data: rows, error } = await supabase
        .from('accounts')
        .select('nessie_account_id, account_type, balance, snapshot_ts, nickname')
        .eq('user_id', userId)
        .order('snapshot_ts', { ascending: true }));

      // Fallback without nickname column
      if (error) {
        const res = await supabase
          .from('accounts')
          .select('nessie_account_id, account_type, balance, snapshot_ts')
          .eq('user_id', userId)
          .order('snapshot_ts', { ascending: true });
        rows = res.data || [];
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        if (alive) {
          setAccounts([]);
          setSelectedId(null);
          setBalanceUSD(0);
          setSelectedType(null);
        }
        return;
      }

      const firstSeenOrder = [];
      const latestById = new Map();
      const seen = new Set();
      for (const r of rows) {
        const id = r.nessie_account_id;
        if (!seen.has(id)) { seen.add(id); firstSeenOrder.push(id); }
        const prev = latestById.get(id);
        if (!prev || new Date(r.snapshot_ts) > new Date(prev.snapshot_ts)) {
          latestById.set(id, r);
        }
      }

      const list = firstSeenOrder.map((id) => {
        const lr = latestById.get(id);
        return {
          id,
          type: lr?.account_type ?? null,
          balance: Number(lr?.balance ?? 0),
          nickname: lr?.nickname ?? null,
          snapshot_ts: lr?.snapshot_ts ?? null,
        };
      });

      if (!alive) return;
      setAccounts(list);

      // Default: last chosen (localStorage) or the oldest account created (firstSeen)
      const saved = localStorage.getItem(ACCT_LS_KEY);
      const defaultId = saved && list.some((a) => a.id === saved) ? saved : firstSeenOrder[0] ?? null;
      setSelectedId(defaultId);

      const def = list.find((a) => a.id === defaultId);
      if (def) {
        setBalanceUSD(def.balance);
        setSelectedType(def.type ?? null);
      }
    })();

    return () => { alive = false; };
  }, [userId]);

  // Persist selection
  useEffect(() => {
    if (selectedId) localStorage.setItem(ACCT_LS_KEY, selectedId);
  }, [selectedId]);

  // Fetch data for current selection (runs on load and after hard refresh)
  useEffect(() => {
    let alive = true;
    if (!userId || !selectedId) return;

    (async () => {
      // Confirm latest snapshot (and nickname if we just learned it)
      const { data: latest } = await supabase
        .from('accounts')
        .select('account_type, balance, snapshot_ts, nickname')
        .eq('user_id', userId)
        .eq('nessie_account_id', selectedId)
        .order('snapshot_ts', { ascending: false })
        .limit(1);

      if (alive && Array.isArray(latest) && latest[0]) {
        setSelectedType(latest[0].account_type ?? null);
        setBalanceUSD(Number(latest[0].balance ?? 0));
        if (latest[0].nickname) {
          setAccounts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, nickname: latest[0].nickname } : p)));
        }
      }

      // Recent transactions for this account (10)
      // Try nessie_account_id first, then fallback to account_id
      let txResp = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts, nessie_account_id, status')
        .eq('user_id', userId)
        .eq('nessie_account_id', selectedId)
        .order('ts', { ascending: false })
        .limit(10);

      if (txResp.error && /column.*status/i.test(txResp.error.message || '')) {
        txResp = await supabase
          .from('transactions')
          .select('id, merchant, amount, category, ts, nessie_account_id')
          .eq('user_id', userId)
          .eq('nessie_account_id', selectedId)
          .order('ts', { ascending: false })
          .limit(10);
      }

      if ((txResp.error && /nessie_account_id/i.test(txResp.error.message || '')) ||
          (Array.isArray(txResp.data) && txResp.data.length === 0)) {
        let alt = await supabase
          .from('transactions')
          .select('id, merchant, amount, category, ts, account_id, status')
          .eq('user_id', userId)
          .eq('account_id', selectedId)
          .order('ts', { ascending: false })
          .limit(10);

        if (alt.error && /column.*status/i.test(alt.error.message || '')) {
          alt = await supabase
            .from('transactions')
            .select('id, merchant, amount, category, ts, account_id')
            .eq('user_id', userId)
            .eq('account_id', selectedId)
            .order('ts', { ascending: false })
            .limit(10);
        }

        if (!alt.error && Array.isArray(alt.data)) {
          setRecent(
            alt.data.map((t) => ({
              id: t.id,
              merchant: t.merchant ?? 'Unknown merchant',
              amount: Number(t.amount ?? 0),
              category: t.category ?? 'General',
              timestamp: t.ts,
              status: (t.status || 'completed').toString(),
            }))
          );
        }
      } else if (!txResp.error && Array.isArray(txResp.data)) {
        setRecent(
          txResp.data.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
            status: (t.status || 'completed').toString(),
          }))
        );
      }

      // 90-day transactions (all accounts) for trends
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: last90 } = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts')
        .eq('user_id', userId)
        .gte('ts', since.toISOString())
        .order('ts', { ascending: true });

      if (alive && Array.isArray(last90)) {
        setTrendTx(
          last90.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
          }))
        );
      }
    })();

    return () => { alive = false; };
  }, [userId, selectedId]);

  // PPP (unchanged)
  const [pppTop, setPppTop] = useState([]);
  const [pppMarkers, setPppMarkers] = useState([]);
  const [coordsCache, setCoordsCache] = useState({});
  useEffect(() => {
    let alive = true;
    if (!userId) return;
    (async () => {
      const { data: prof } = await supabase.from('user_profile').select('current_country_code').eq('user_id', userId).maybeSingle();
      const currentCode = (prof?.current_country_code || 'USA').toUpperCase();
      const { data: rows } = await supabase
        .from('ppp_country')
        .select('code, country, 2024_y')
        .not('2024_y', 'is', null)
        .limit(300);
      if (!Array.isArray(rows) || rows.length === 0) return;
      const items = rows
        .map((r) => ({ code: String(r.code || '').toUpperCase(), name: String(r.country || '').toLowerCase(), p: Number(r['2024_y']) }))
        .filter((r) => r.p > 0);
      const base = items.find((r) => r.code === currentCode);
      const basePPP =
        base?.p ??
        (() => {
          const s = [...items].sort((a, b) => a.p - b.p);
          return s[Math.floor(s.length / 2)]?.p ?? 100;
        })();
      const top = items
        .map((r) => ({ city: toTitleCase(r.name), country: toTitleCase(r.name), ppp: r.p, savingsPct: (basePPP - r.p) / basePPP }))
        .sort((a, b) => b.savingsPct - a.savingsPct)
        .slice(0, 6);
      const updates = {};
      for (const d of top) {
        const k = (d.country ?? d.city)?.toLowerCase();
        if (!k || coordsCache[k]) continue;
        const c = await getCountryCoords(d.country || d.city);
        if (c) updates[k] = c;
      }
      if (alive && Object.keys(updates).length) setCoordsCache((prev) => ({ ...prev, ...updates }));
      if (alive) {
        setPppTop(top.slice(0, 3));
        setPppMarkers(
          top
            .map((d) => {
              const k = (d.country ?? d.city)?.toLowerCase();
              const c = coordsCache[k];
              return c ? { city: d.city, coords: c, ppp: d.ppp } : null;
            })
            .filter(Boolean)
            .slice(0, 5)
        );
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coordsCache]);

  // Trends/notifications
  const trendData = useMemo(() => groupByWeek(trendTx), [trendTx]);
  const weeklyChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData.at(-1).amount;
    const prev = trendData.at(-2).amount || 1;
    const d = ((last - prev) / prev) * 100;
    return Number.isFinite(d) ? d : null;
  }, [trendData]);
  const budgetDelta = useMemo(() => {
    const cut = new Date(); cut.setDate(cut.getDate() - 30);
    const last30 = trendTx.filter((t) => new Date(t.timestamp) >= cut);
    const spent = last30.reduce((s, t) => s + Math.max(0, Number(t.amount || 0)), 0);
    return (baseMonthlyBudget || 0) - spent;
  }, [trendTx, baseMonthlyBudget]);

  // UI labels
  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here’s how $${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : 'Let’s see how your money travels.';

  // Render
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero / Accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/90">
          <CardHeader>
            <CardTitle>{heroLabel}</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Dynamic budget profile</p>
          </CardHeader>
          <CardContent>
            {/* Account selector: HARD RELOAD on change */}
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-slate/60">Account</label>
              <select
                className="w-full rounded-2xl border border-slate/20 bg-white/80 px-3 py-2 text-sm text-navy shadow-inner focus:border-red focus:outline-none focus:ring-2 focus:ring-red/20 sm:w-auto"
                value={selectedId ?? ''}
                onChange={(e) => {
                  const next = e.target.value || null;
                  if (next) {
                    localStorage.setItem(ACCT_LS_KEY, next);
                  } else {
                    localStorage.removeItem(ACCT_LS_KEY);
                  }
                  // force full reload to guarantee fresh data render
                  window.location.reload();
                }}
              >
                {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nickname?.trim() || `${a.type || 'Account'} • ${a.id.slice(-4)}`}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-3xl font-poppins font-semibold text-teal">{fmtUSD(balanceUSD)}</p>
            <p className="mt-1 text-xs text-charcoal/60">
              {selectedType ? `Type: ${selectedType}` : accounts.length === 0 ? 'No accounts yet.' : 'Select an account.'}
            </p>

            <p className="mt-3 text-sm text-charcoal/70">{heroSubtitle}</p>
            <p className="mt-3 text-xs text-charcoal/50">Dashboard = balances, travel power, and PPP-led opportunities.</p>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 bg-white/90">
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Last 30 days</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
                  We’ll populate this once your transactions sync.
                </li>
              )}
              {recent.map((t) => (
                <li key={t.id} className="flex flex-col justify-between rounded-2xl bg-offwhite/80 px-4 py-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-charcoal">
                      {t.merchant}
                      <span className="ml-2 rounded-full border border-slate/200 bg-white/60 px-2 py-[2px] text-[10px] uppercase tracking-wide text-slate/70">
                        {t.status}
                      </span>
                    </p>
                    <p className="text-xs text-charcoal/60">
                      {new Date(t.timestamp ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 text-right sm:mt-0">
                    <p className="font-semibold text-coral">{fmtUSD(t.amount)}</p>
                    <p className="text-xs text-charcoal/60">{t.category}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Trends + Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Trends & insights</CardTitle>
            <p className="text-sm text-charcoal/70">
              {(() => {
                if (trendData.length < 2) return 'We’ll track spend trends once we have two weeks of data.';
                const last = trendData.at(-1).amount;
                const prev = trendData.at(-2).amount || 1;
                const wc = Number.isFinite((last - prev) / prev) ? (((last - prev) / prev) * 100).toFixed(1) : null;
                return wc != null
                  ? `Your spending is ${wc >= 0 ? 'up' : 'down'} ${Math.abs(wc)}% from last week.`
                  : 'We’ll track spend trends once we have two weeks of data.';
              })()}
            </p>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={groupByWeek(trendTx).map(({ label, amount }) => ({ label, amount }))} />
          </CardContent>
        </Card>

        <NotificationsWidget
          items={(() => {
            const notes = [];
            const last = trendData.at(-1)?.amount ?? null;
            const prev = trendData.at(-2)?.amount ?? null;
            if (last != null && prev != null && prev !== 0) {
              const wc = ((last - prev) / prev) * 100;
              if (Number.isFinite(wc)) {
                notes.push(`Your weekly spending is ${wc > 0 ? 'up' : 'down'} ${Math.abs(Math.round(wc))}% vs. last week.`);
              }
            }
            if (Number.isFinite(budgetDelta)) {
              if (budgetDelta > 0) notes.push(`You’re pacing $${Math.round(budgetDelta).toLocaleString()} under budget — bank the surplus for travel.`);
              else if (budgetDelta < 0) notes.push(`You’re trending $${Math.abs(Math.round(budgetDelta)).toLocaleString()} over budget — adjust for your next trip.`);
            }
            return notes;
          })()}
        />
      </div>

      {/* PPP map + picks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP score heatmap</CardTitle>
            <p className="text-sm text-charcoal/70">Hover the globe to see how your purchasing power compares.</p>
          </CardHeader>
          <CardContent>
            <WorldMap markers={pppMarkers} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <SavingsRunwayPanel
            destinations={pppTop.map((d) => ({ city: d.city, monthlyCost: d.ppp, ppp: d.ppp, savings: d.savingsPct }))}
            stayLengthMonths={6}
          />
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Top PPP picks</CardTitle>
              <p className="text-sm text-charcoal/70">GeoBudget = personalized travel & budget forecasting.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pppTop.map((d) => (
                <CityCard key={d.city} city={d.city} ppp={d.ppp} savingsPct={d.savingsPct} />
              ))}
              {pppTop.length === 0 && (
                <div className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-sm text-charcoal/60">
                  We’re fetching PPP insights — check back shortly.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
