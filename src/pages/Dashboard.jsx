import { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import { ONBOARDING_SESSION_FLAG } from '../lib/personalization.js';
import OnboardingModal from '../components/onboarding/OnboardingModal.jsx';
import { supabase } from '../lib/supabase.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) ?? 0);
}

function toTitleCase(s = '') {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function groupTransactionsByWeek(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const weekMap = new Map();

  transactions.forEach((txn) => {
    const ts = new Date(txn.timestamp ?? txn.date ?? txn.ts ?? Date.now());
    if (Number.isNaN(ts.getTime())) return;
    const monday = new Date(ts);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // move to Monday
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const label = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const key = monday.toISOString();
    const amount = Math.abs(Number(txn.amount ?? 0));
    weekMap.set(key, {
      key,
      label,
      amount: (weekMap.get(key)?.amount ?? 0) + amount,
      date: monday,
    });
  });

  return Array.from(weekMap.values()).sort((a, b) => a.date - b.date);
}

function buildNotifications({ bestCity, runnerUp, weeklyChange, budgetDelta }) {
  const notes = [];

  if (bestCity && runnerUp) {
    const monthlyDiff = Math.max(0, Number(runnerUp.monthlyCost ?? 0) - Number(bestCity.monthlyCost ?? 0));
    if (monthlyDiff > 0) {
      notes.push(
        `Choosing ${bestCity.city} over ${runnerUp.city} saves about $${Math.round(monthlyDiff).toLocaleString()} each month.`
      );
    }
  }

  if (Number.isFinite(weeklyChange)) {
    const label = weeklyChange > 0 ? 'up' : 'down';
    notes.push(`Your weekly spending is ${label} ${Math.abs(Math.round(weeklyChange))}% vs. last week.`);
  }

  if (Number.isFinite(budgetDelta)) {
    if (budgetDelta > 0) {
      notes.push(`You’re pacing $${Math.round(budgetDelta).toLocaleString()} under budget — bank the surplus for travel.`);
    } else if (budgetDelta < 0) {
      notes.push(`You’re trending $${Math.abs(Math.round(budgetDelta)).toLocaleString()} over budget — adjust for your next trip.`);
    }
  }

  return notes;
}

// Fetch approximate country center from OpenStreetMap (fallback if we don’t have coords)
async function getCountryCoords(countryName) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=json&limit=1`
    );
    const data = await resp.json();
    if (Array.isArray(data) && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {}
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  const { data: personalization, loading: personalizationLoading, completeOnboarding } = usePersonalization(userId);

  // Identity & budget display
  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName && md.displayName.trim()) return md.displayName.trim();
    if (user.email) return user.email.split('@')[0] ?? '';
    return '';
  }, [user]);

  const displayName = profile?.name ?? identityFallback;

  const { data: personalization, loading: personalizationLoading, completeOnboarding } = usePersonalization(userId);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const flag = window.sessionStorage.getItem(ONBOARDING_SESSION_FLAG);
    if (flag === '1') {
      setShouldShowOnboarding(true);
    }
  }, []);

  const finishOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ONBOARDING_SESSION_FLAG);
    }
    setShouldShowOnboarding(false);
  }, []);

  useEffect(() => {
    if (personalization?.onboardingComplete) {
      finishOnboarding();
    }
  }, [personalization?.onboardingComplete, finishOnboarding]);

  const { balanceUSD = 0 } = useAccount();
  const baseMonthlyBudget = useMemo(() => {
    if (personalization?.monthlyBudget) return personalization.monthlyBudget;
    if (profile?.monthly_budget) return profile.monthly_budget;
    return 2500;
  }, [personalization?.monthlyBudget, profile?.monthly_budget]);

  // ── Supabase-backed account & transactions ────────────────────────────────
  const [balanceUSD, setBalanceUSD] = useState(0);
  const [recent, setRecent] = useState([]);           // last ~10 transactions
  const [allTxForTrends, setAllTxForTrends] = useState([]); // last 90 days for charts

  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
      // Balance: latest snapshot in accounts table
      const { data: acctRows, error: acctErr } = await supabase
        .from('accounts')
        .select('balance, currency_code, snapshot_ts')
        .eq('user_id', userId)
        .order('snapshot_ts', { ascending: false })
        .limit(1);

      if (!acctErr && acctRows?.length > 0 && alive) {
        setBalanceUSD(Number(acctRows[0].balance ?? 0));
      }

      // Recent transactions (10)
      const { data: txRows, error: txErr } = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts')
        .eq('user_id', userId)
        .order('ts', { ascending: false })
        .limit(10);

      if (!txErr && Array.isArray(txRows) && alive) {
        setRecent(
          txRows.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
          }))
        );
      }

      // Transactions for last 90 days (for trend chart & budget math)
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: tx90, error: tx90Err } = await supabase
        .from('transactions')
        .select('id, merchant, amount, category, ts')
        .eq('user_id', userId)
        .gte('ts', since.toISOString())
        .order('ts', { ascending: true });

      if (!tx90Err && Array.isArray(tx90) && alive) {
        setAllTxForTrends(
          tx90.map((t) => ({
            id: t.id,
            merchant: t.merchant ?? 'Unknown merchant',
            amount: Number(t.amount ?? 0),
            category: t.category ?? 'General',
            timestamp: t.ts,
          }))
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId]);

  // Trend data (weekly sums)
  const trendData = useMemo(() => groupTransactionsByWeek(allTxForTrends), [allTxForTrends]);

  // Weekly change % (last week vs prior)
  const weeklyChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1].amount;
    const prev = trendData[trendData.length - 2].amount || 1;
    if (!prev) return null;
    const delta = ((last - prev) / prev) * 100;
    return Number.isFinite(delta) ? delta : null;
  }, [trendData]);

  // Budget delta (last 30 days spend vs baseMonthlyBudget)
  const budgetDelta = useMemo(() => {
    const cut = new Date();
    cut.setDate(cut.getDate() - 30);
    const last30 = allTxForTrends.filter((t) => new Date(t.timestamp) >= cut);
    const spent = last30.reduce((s, t) => s + Math.max(0, Number(t.amount ?? 0)), 0);
    if (!baseMonthlyBudget) return null;
    return Number(baseMonthlyBudget) - spent; // positive = under budget
  }, [allTxForTrends, baseMonthlyBudget]);

  // ── PPP from Supabase ppp_country (country-level) ─────────────────────────
  const [pppTop, setPppTop] = useState([]);
  const [pppMarkers, setPppMarkers] = useState([]);
  const [coordsCache, setCoordsCache] = useState({});

  useEffect(() => {
    let alive = true;
    if (!userId) return;

    (async () => {
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

      if (!Array.isArray(rows) || rows.length === 0) return;

      const items = rows
        .map((r) => ({
          code: String(r.code || '').toUpperCase(),
          name: String(r.country || '').toLowerCase(),
          ppp: Number(r['2024_y']),
        }))
        .filter((r) => r.ppp > 0);

      const baseline = items.find((r) => r.code === currentCode);
      const baselinePPP = baseline?.ppp ?? (() => {
        const sorted = [...items].sort((a, b) => a.ppp - b.ppp);
        const mid = Math.floor(sorted.length / 2);
        return sorted[mid]?.ppp ?? 100;
      })();

      const enriched = items
        .map((r) => {
          const savings = (baselinePPP - r.ppp) / baselinePPP;
          return {
            city: toTitleCase(r.name),     // display label
            country: toTitleCase(r.name),  // for coords lookup
            ppp: r.ppp,
            savingsPct: Math.max(-1, Math.min(1, savings)),
          };
        })
        .sort((a, b) => b.savingsPct - a.savingsPct);

      const top = enriched.slice(0, 6);

      // fetch coords for the top options (cache)
      const updates = {};
      for (const dest of top) {
        const key = (dest.country ?? dest.city)?.toLowerCase();
        if (!key || coordsCache[key]) continue;
        const coords = await getCountryCoords(dest.country || dest.city);
        if (coords) updates[key] = coords;
      }
      if (alive && Object.keys(updates).length > 0) {
        setCoordsCache((prev) => ({ ...prev, ...updates }));
      }

      if (alive) {
        setPppTop(top.slice(0, 3));
        setPppMarkers(
          top
            .map((d) => {
              const key = (d.country ?? d.city)?.toLowerCase();
              const coords = coordsCache[key];
              if (!coords) return null;
              return { city: d.city, coords, ppp: d.ppp };
            })
            .filter(Boolean)
            .slice(0, 5)
        );
      }
    })();

    return () => {
      alive = false;
    };
    // include coordsCache so markers update as we fetch coords
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, coordsCache]);

  // Notifications based on PPP + spend
  const notifications = useMemo(
    () =>
      buildNotifications({
        bestCity: pppTop[0],
        runnerUp: pppTop[1],
        weeklyChange,
        budgetDelta,
      }),
    [pppTop, weeklyChange, budgetDelta]
  );

  // UI labels
  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here’s how $${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : 'Let’s see how your money travels.';

  const showOnboarding =
    shouldShowOnboarding && !personalizationLoading && !personalization?.onboardingComplete;

  const handleOnboardingComplete = useCallback(
    async (payload) => {
      await completeOnboarding(payload);
      finishOnboarding();
    },
    [completeOnboarding, finishOnboarding]
  );

  const handleOnboardingSkip = useCallback(async () => {
    await completeOnboarding({});
    finishOnboarding();
  }, [completeOnboarding, finishOnboarding]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <OnboardingModal
        isOpen={showOnboarding}
        defaultValues={personalization}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        displayName={displayName}
      />

      {/* Hero cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/90">
          <CardHeader>
            <CardTitle>{heroLabel}</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Dynamic budget profile</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-poppins font-semibold text-teal">{formatUSD(balanceUSD)}</p>
            <p className="mt-2 text-sm text-charcoal/70">{heroSubtitle}</p>
            <p className="mt-3 text-xs text-charcoal/50">
              Dashboard = balances, travel power, and PPP-led opportunities.
            </p>
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
              {recent.map((txn) => (
                <li
                  key={txn.id}
                  className="flex flex-col justify-between rounded-2xl bg-offwhite/80 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-charcoal">{txn.merchant ?? 'Unknown merchant'}</p>
                    <p className="text-xs text-charcoal/60">
                      {new Date(txn.timestamp ?? txn.date ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-2 text-right sm:mt-0">
                    <p className="font-semibold text-coral">{formatUSD(txn.amount)}</p>
                    <p className="text-xs text-charcoal/60">{txn.category ?? 'General'}</p>
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
              {weeklyChange != null
                ? `Your spending is ${weeklyChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyChange).toFixed(1)}% from last week.`
                : 'We’ll track spend trends once we have two weeks of data.'}
            </p>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={trendData.map(({ label, amount }) => ({ label, amount }))} />
          </CardContent>
        </Card>

        <NotificationsWidget items={notifications} />
      </div>

      {/* Map + Top destinations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP score heatmap</CardTitle>
            <p className="text-sm text-charcoal/70">
              Hover the globe to see how your purchasing power compares.
            </p>
          </CardHeader>
          <CardContent>
            <WorldMap markers={pppMarkers} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <SavingsRunwayPanel
            destinations={pppTop.map((d) => ({
              city: d.city,
              monthlyCost: d.ppp, // If your component expects a modeled monthly cost, you can map PPP → cost elsewhere.
              ppp: d.ppp,
              savings: d.savingsPct,
            }))}
            stayLengthMonths={6}
          />
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Top PPP picks</CardTitle>
              <p className="text-sm text-charcoal/70">
                GeoBudget = personalized travel & budget forecasting.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pppTop.map((dest) => (
                <CityCard
                  key={dest.city}
                  city={dest.city}
                  ppp={dest.ppp}
                  savingsPct={dest.savingsPct}
                />
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

export default Dashboard;


