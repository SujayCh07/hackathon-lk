import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';

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

  const { data: personalization } = usePersonalization(userId);

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

  const pppMarkers = useMemo(() => {
    return topDestinations
      .map((city) => {
        const coords =
          COUNTRY_COORDS[city.country?.toLowerCase?.() ?? ''] ?? COUNTRY_COORDS[city.city?.toLowerCase?.() ?? ''];
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
  }, [topDestinations]);

  const pppTop = topDestinations.slice(0, 3);

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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-1 bg-white/90">
          <CardHeader>
            <CardTitle>{heroLabel}</CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-teal/60">Dynamic budget profile</p>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-poppins font-semibold text-teal">{formatUSD(balanceUSD)}</p>
            <p className="mt-2 text-sm text-charcoal/70">{heroSubtitle}</p>
            <p className="mt-3 text-xs text-charcoal/50">
              Dashboard = at a glance: balances, travel power, and PPP-led opportunities.
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
                  We’ll populate this the moment your Nessie transactions sync.
                </li>
              )}
              {recent.map((txn) => (
                <li key={txn.id} className="flex items-center justify-between rounded-2xl bg-offwhite/80 px-4 py-3">
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
                : 'We’ll track spend trends once a second week of data lands.'}
            </p>
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={trendData.map(({ label, amount }) => ({ label, amount }))} />
          </CardContent>
        </Card>

        <NotificationsWidget items={notifications} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>PPP score heatmap</CardTitle>
            <p className="text-sm text-charcoal/70">
              Hover the globe to see how your purchasing power compares city by city.
            </p>
          </CardHeader>
          <CardContent>
            <WorldMap markers={pppMarkers} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <SavingsRunwayPanel destinations={topDestinations} stayLengthMonths={6} />
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Top PPP picks</CardTitle>
              <p className="text-sm text-charcoal/70">GeoBudget = plan travels with personalised budget forecasting.</p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {pppTop.map((dest) => (
                <CityCard key={dest.city} city={dest.city} ppp={dest.ppp} savingsPct={dest.savings ?? dest.savingsPct} />
              ))}
              {pppTop.length === 0 && (
                <div className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-sm text-charcoal/60">
                  We’re fetching PPP insights — check back in a beat.
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
