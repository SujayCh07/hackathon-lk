import { useMemo, useEffect, useState } from 'react';
import { CreditCardIcon, ChartBarIcon, GlobeAmericasIcon, WalletIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import OnboardingModal from '../components/onboarding/OnboardingModal.jsx';

// --- Helpers ---
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
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
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

// --- API: fetch country coordinates ---
async function getCountryCoords(countryName) {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(countryName)}&format=json&limit=1`
  );
  const data = await resp.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}

// --- Main Component ---
export function Dashboard() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);

  const identityFallback = useMemo(() => {
    if (!user) return '';
    const md = user.user_metadata ?? {};
    if (md.displayName && md.displayName.trim()) return md.displayName.trim();
    if (user.email) return user.email.split('@')[0] ?? '';
    return '';
  }, [user]);

  const displayName = profile?.name ?? identityFallback;

  const { data: personalization, loading: personalizationLoading, completeOnboarding } = usePersonalization(userId);

  const { balanceUSD = 0 } = useAccount();
  const baseMonthlyBudget = useMemo(() => {
    if (personalization?.monthlyBudget) return personalization.monthlyBudget;
    if (profile?.monthlyBudget) return profile.monthlyBudget;
    return 2500;
  }, [personalization?.monthlyBudget, profile?.monthlyBudget]);

  const { transactions, recent, spendingMetrics } = useTransactions({
    limit: 6,
    monthlyBudget: baseMonthlyBudget,
    balanceUSD,
  });

  const trendData = useMemo(() => groupTransactionsByWeek(transactions), [transactions]);

  const weeklyChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const last = trendData[trendData.length - 1].amount;
    const prev = trendData[trendData.length - 2].amount || 1;
    if (!prev) return null;
    const delta = ((last - prev) / prev) * 100;
    return Number.isFinite(delta) ? delta : null;
  }, [trendData]);

  const { rankedBySavings } = usePPP();

  const topDestinations = useMemo(() => {
    if (!Array.isArray(rankedBySavings)) return [];
    const focus = personalization?.budgetFocus ?? 'Balanced';
    return rankedBySavings.slice(0, 6).map((city) => ({
      ...city,
      city: toTitleCase(city.city ?? ''),
      context:
        focus === 'Rent'
          ? 'Best rent-to-income ratio'
          : focus === 'Food'
          ? 'Strong dining affordability'
          : focus === 'Leisure'
          ? 'Leisure spending goes further here'
          : 'Balanced across categories',
      runwayMonths:
        Number.isFinite(city.monthlyCost) && city.monthlyCost > 0
          ? (baseMonthlyBudget ?? 0) / city.monthlyCost
          : null,
    }));
  }, [rankedBySavings, personalization?.budgetFocus, baseMonthlyBudget]);

  // fetch dynamic coords
  const [coordsCache, setCoordsCache] = useState({});
  useEffect(() => {
    const fetchCoords = async () => {
      const updates = {};
      for (const city of topDestinations) {
        const key = (city.country ?? city.city)?.toLowerCase();
        if (!key || coordsCache[key]) continue;
        const coords = await getCountryCoords(city.country || city.city);
        if (coords) updates[key] = coords;
      }
      if (Object.keys(updates).length > 0) {
        setCoordsCache((prev) => ({ ...prev, ...updates }));
      }
    };
    fetchCoords();
  }, [topDestinations]);

  const pppMarkers = useMemo(() => {
    return topDestinations
      .map((city) => {
        const key = (city.country ?? city.city)?.toLowerCase();
        const coords = coordsCache[key];
        if (!coords) return null;
        return {
          city: city.city,
          coords,
          ppp: city.ppp ?? 1,
          context: city.context,
        };
      })
      .filter(Boolean)
      .slice(0, 5);
  }, [topDestinations, coordsCache]);

  const notifications = useMemo(
    () =>
      buildNotifications({
        bestCity: topDestinations[0],
        runnerUp: topDestinations[1],
        weeklyChange,
        budgetDelta: spendingMetrics?.budgetDelta ?? null,
      }),
    [spendingMetrics?.budgetDelta, topDestinations, weeklyChange]
  );

  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here’s how $${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : 'Let’s see how your money travels.';

  const showOnboarding = !personalizationLoading && !personalization?.onboardingComplete;
  const handleOnboardingComplete = async (payload) => {
    await completeOnboarding(payload);
  };

  const baseCardClasses =
    'relative h-full rounded-2xl border border-white/30 bg-gradient-to-br from-[#052962]/15 via-[#e0ecff]/60 to-white/95 text-slate/80 shadow-lg shadow-navy/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/25';
  const heroCardClasses =
    'relative h-full rounded-2xl border border-[#0f3b75]/50 bg-gradient-to-br from-[#052962] via-[#0f3b75] to-[#63a4ff]/65 text-white shadow-xl shadow-navy/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/50';

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-[#f4f8ff] via-white to-[#eef3ff]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(9,80,166,0.12),transparent_55%)]"
        aria-hidden="true"
      />
      <OnboardingModal
        isOpen={showOnboarding}
        defaultValues={personalization}
        onComplete={handleOnboardingComplete}
        onSkip={() => completeOnboarding({ ...personalization, onboardingComplete: true })}
        displayName={displayName}
      />

      <div className="grid auto-rows-[minmax(0,1fr)] grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className={heroCardClasses}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(227,24,55,0.18),transparent_75%)]"
          />
          <CardHeader className="flex items-start justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white">
                <WalletIcon className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-white">{heroLabel}</CardTitle>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Dynamic budget profile</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-white/90">
            <p className="text-4xl font-bold text-white">{formatUSD(balanceUSD)}</p>
            <p className="text-sm leading-relaxed text-white/85">{heroSubtitle}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              Dashboard = balances, travel power, and PPP-led opportunities.
            </p>
          </CardContent>
        </Card>

        <Card className={baseCardClasses}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(9,80,166,0.18),transparent_70%)]"
          />
          <CardHeader className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052962]/10 text-[#052962]">
                <CreditCardIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-[#052962]">Recent transactions</CardTitle>
                <p className="text-xs uppercase tracking-[0.2em] text-[#1e4b93]/70">Last 30 days</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-[#0f3b75]/30 bg-white/40 px-4 py-6 text-center text-sm text-slate/70">
                  No transactions yet. Sync your card to get started.
                </li>
              )}
              {recent.map((txn) => (
                <li
                  key={txn.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#0f3b75]/10 bg-white/55 px-4 py-4 shadow-sm transition-all duration-200 hover:border-[#052962]/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-[#052962]">{txn.merchant ?? 'Unknown merchant'}</p>
                    <p className="text-xs text-[#1e4b93]/70">
                      {new Date(txn.timestamp ?? txn.date ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-[#e31837]">{formatUSD(txn.amount)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#1e4b93]/70">{txn.category ?? 'General'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={baseCardClasses}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(9,80,166,0.18),transparent_70%)]"
          />
          <CardHeader className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052962]/10 text-[#052962]">
                <ChartBarIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-[#052962]">Trends & insights</CardTitle>
                <p className="text-sm text-slate/70">
                  {weeklyChange != null
                    ? `Your spending is ${weeklyChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyChange).toFixed(1)}% from last week.`
                    : 'We’ll track spend trends once we have two weeks of data.'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SpendingTrendChart data={trendData.map(({ label, amount }) => ({ label, amount }))} />
          </CardContent>
        </Card>

        <NotificationsWidget items={notifications} className="h-full" />

        <Card className={`${baseCardClasses} lg:col-span-2`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(9,80,166,0.18),transparent_70%)]"
          />
          <CardHeader className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052962]/10 text-[#052962]">
                <GlobeAmericasIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold text-[#052962]">PPP score heatmap</CardTitle>
                <p className="text-sm text-slate/70">Hover the globe to see how your purchasing power compares.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorldMap markers={pppMarkers} />
          </CardContent>
        </Card>

        <SavingsRunwayPanel
          destinations={topDestinations}
          stayLengthMonths={6}
          className="lg:col-span-2"
        />
      </div>
    </div>
  );
}

export default Dashboard;
