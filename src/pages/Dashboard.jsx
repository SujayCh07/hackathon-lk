import { useMemo, useEffect, useState } from 'react';
import {
  WalletIcon,
  CreditCardIcon,
  ChartBarIcon,
  LightBulbIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
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
function PiggyBankIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4.75 12.25c0-3.45 2.86-6.25 6.4-6.25h2.2c3.07 0 5.6 2.49 5.6 5.56v1.14l1.5.75-1.5.75v1.24a3.91 3.91 0 01-3.91 3.91h-1.05a1.85 1.85 0 11-3.7 0H9.1a4.35 4.35 0 01-4.35-4.35z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 18v1.5M16.5 18v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 6.25h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.25 11.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" fill="currentColor" />
    </svg>
  );
}

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

  const cardSurface =
    'group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1f3f]/95 via-[#123d70]/85 to-[#f5f8ff]/95 p-6 shadow-lg shadow-[#052962]/20 ring-1 ring-white/20 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_top,_rgba(227,24,55,0.14),transparent_65%)] after:pointer-events-none after:absolute after:-top-10 after:right-[-12%] after:h-24 after:w-24 after:rounded-full after:bg-[#e31837]/12 after:blur-3xl transform-gpu transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl hover:shadow-[#052962]/30 hover:ring-[#e31837]/20 sm:after:h-32 sm:after:w-32';
  const headerBadgeClass =
    'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-[#052962] ring-1 ring-white/40';
  const budgetDelta = spendingMetrics?.budgetDelta ?? null;
  const budgetDeltaLabel =
    budgetDelta == null
      ? 'Sync spending to unlock pacing insights'
      : budgetDelta > 0
      ? `${formatUSD(Math.abs(budgetDelta))} under plan`
      : budgetDelta < 0
      ? `${formatUSD(Math.abs(budgetDelta))} over plan`
      : 'Right on target';
  const budgetDeltaColor =
    budgetDelta == null ? 'text-white' : budgetDelta >= 0 ? 'text-emerald-200' : 'text-[#ffb5c0]';
  const weeklySummary =
    weeklyChange != null
      ? `Spending is ${weeklyChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyChange).toFixed(1)}% versus last week.`
      : 'We’ll track spend trends once we have two weeks of data.';
  const bestDestination = topDestinations[0];
  const pppSpotlight = bestDestination
    ? `${bestDestination.city} delivers a PPP score of ${bestDestination.ppp?.toFixed?.(0) ?? '—'} with ${
        bestDestination.context ?? 'balanced opportunities'
      }. ${
        bestDestination.monthlyCost
          ? `Approx. ${formatUSD(bestDestination.monthlyCost)}/mo in your focus category.`
          : ''
      }`
    : 'PPP insights load as soon as we have enough travel data.';
  const emptyTransactionsMessage = 'No transactions yet. Sync your card to get started.';

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-64 bg-[radial-gradient(circle_at_top,_rgba(5,41,98,0.2),transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 bottom-0 -z-10 h-80 bg-[radial-gradient(circle_at_bottom,_rgba(19,99,190,0.18),transparent_70%)] blur-3xl"
      />

      <OnboardingModal
        isOpen={showOnboarding}
        defaultValues={personalization}
        onComplete={handleOnboardingComplete}
        onSkip={() => completeOnboarding({ ...personalization, onboardingComplete: true })}
        displayName={displayName}
      />

      <div className="grid auto-rows-fr gap-6 xl:grid-cols-2">
        <Card className={`${cardSurface} h-full`}>
          <CardHeader className="mb-6 flex items-start gap-4">
            <span className={headerBadgeClass}>
              <WalletIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-2xl font-semibold text-white drop-shadow-sm">{heroLabel}</CardTitle>
              <p className="text-sm text-[#d0defa]">{heroSubtitle}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-[#d0defa]/90">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Current balance</p>
              <p className="mt-2 text-4xl font-bold text-white drop-shadow-lg">{formatUSD(balanceUSD)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Monthly budget</p>
                <p className="mt-3 text-lg font-semibold text-white">{formatUSD(baseMonthlyBudget)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Pacing</p>
                <p className={`mt-3 text-lg font-semibold ${budgetDeltaColor}`}>{budgetDeltaLabel}</p>
              </div>
            </div>
            <p className="text-xs text-white/70">Dashboard = balances, travel power, and PPP-led opportunities.</p>
          </CardContent>
        </Card>

        <Card className={`${cardSurface} h-full`}>
          <CardHeader className="mb-6 flex items-start gap-4">
            <span className={headerBadgeClass}>
              <CreditCardIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-2xl font-semibold text-white drop-shadow-sm">Recent transactions</CardTitle>
              <p className="text-sm text-[#d0defa]">Last 30 days</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/80">
            <ul className="space-y-3">
              {recent.length === 0 && (
                <li className="rounded-2xl border border-dashed border-white/35 bg-white/10 px-6 py-8 text-center text-sm text-white/80">
                  {emptyTransactionsMessage}
                </li>
              )}
              {recent.map((txn) => (
                <li
                  key={txn.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl bg-white/15 px-5 py-4 text-white shadow-inner shadow-white/10 ring-1 ring-white/25 transition duration-200 hover:bg-white/20 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-base font-semibold text-white drop-shadow">{txn.merchant ?? 'Unknown merchant'}</p>
                    <p className="text-xs text-white/70">
                      {new Date(txn.timestamp ?? txn.date ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-[#ffccd5]">{formatUSD(txn.amount)}</p>
                    <p className="text-xs text-white/70">{txn.category ?? 'General'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={`${cardSurface} h-full`}>
          <CardHeader className="mb-6 flex items-start gap-4">
            <span className={headerBadgeClass}>
              <ChartBarIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-2xl font-semibold text-white drop-shadow-sm">Trends & insights</CardTitle>
              <p className="text-sm text-[#d0defa]">{weeklySummary}</p>
            </div>
          </CardHeader>
          <CardContent className="!space-y-0">
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <SpendingTrendChart data={trendData.map(({ label, amount }) => ({ label, amount }))} />
            </div>
          </CardContent>
        </Card>

        <NotificationsWidget
          items={notifications}
          icon={LightBulbIcon}
          subtitle="We turn PPP swings into actionable moves."
          emptyStateMessage="Once we have enough data we’ll start dropping personalised travel plays here."
        />

        <Card className={`${cardSurface} h-full xl:col-span-2`}>
          <CardHeader className="mb-6 flex items-start gap-4">
            <span className={headerBadgeClass}>
              <GlobeAltIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-2xl font-semibold text-white drop-shadow-sm">PPP score heatmap</CardTitle>
              <p className="text-sm text-[#d0defa]">Hover the globe to see how your purchasing power compares.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-sm text-[#d0defa]/90">
            <p>{pppSpotlight}</p>
            <div className="overflow-hidden rounded-2xl bg-white/5 p-2 ring-1 ring-white/20">
              <WorldMap markers={pppMarkers} />
            </div>
          </CardContent>
        </Card>

        <SavingsRunwayPanel
          destinations={topDestinations}
          stayLengthMonths={6}
          icon={PiggyBankIcon}
          subtitle="See how long your savings travel when you follow today’s top PPP plays."
        />
      </div>
    </div>
  );
}

export default Dashboard;
