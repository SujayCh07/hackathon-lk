import { useMemo, useEffect, useState } from 'react';
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
import OnboardingModal from '../components/onboarding/OnboardingModal.jsx';
import { fetchRecentNudges, upsertNudges } from '../lib/nudges.js';

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

function getCategoryStyles(category) {
  const normalized = (category ?? '').toLowerCase();
  if (normalized.includes('rent')) return 'bg-coral/10 text-coral';
  if (normalized.includes('groc') || normalized.includes('food')) return 'bg-teal/10 text-teal';
  if (normalized.includes('transport') || normalized.includes('travel')) return 'bg-sky/10 text-sky-700';
  if (normalized.includes('entertain')) return 'bg-violet-100 text-violet-700';
  if (normalized.includes('health')) return 'bg-emerald-100 text-emerald-700';
  if (normalized.includes('utility')) return 'bg-amber-100 text-amber-700';
  return 'bg-navy/10 text-navy';
}

function buildNotifications({
  bestCity,
  runnerUp,
  weeklyChange,
  budgetDelta,
  savingsGoal,
  totals,
  personalization,
}) {
  const notes = [];
  const interestSet = new Set((personalization?.travelInterests ?? []).filter(Boolean));
  const categorySet = new Set((personalization?.favoriteCategories ?? []).filter(Boolean));

  if (bestCity && runnerUp) {
    const monthlyDiff = Math.max(0, Number(runnerUp.monthlyCost ?? 0) - Number(bestCity.monthlyCost ?? 0));
    if (monthlyDiff > 0) {
      notes.push({
        slug: `ppp-${bestCity.city}-vs-${runnerUp.city}`.toLowerCase(),
        title: `${bestCity.city} stretches your spend`,
        message: `Swapping ${runnerUp.city} for ${bestCity.city} keeps roughly $${Math.round(monthlyDiff).toLocaleString()} in your pocket every month.`,
        variant: 'positive',
        icon: 'globe',
        actionLabel: 'Open GeoBudget',
        actionHref: '/planner',
      });
    }
  }

  if (Number.isFinite(weeklyChange)) {
    const label = weeklyChange > 0 ? 'up' : 'down';
    const variant = weeklyChange > 0 ? 'warning' : 'positive';
    notes.push({
      slug: `weekly-change-${label}`,
      title: 'Weekly trend update',
      message: `Your weekly spending is ${label} ${Math.abs(Math.round(weeklyChange))}% compared to last week.`,
      variant,
      icon: weeklyChange > 0 ? 'trending-up' : 'trending-down',
      actionLabel: 'Review Smart-Spend',
      actionHref: '/insights',
    });
  }

  if (Number.isFinite(budgetDelta)) {
    if (budgetDelta > 0) {
      notes.push({
        slug: 'budget-under',
        title: 'You’re under budget',
        message: `Running $${Math.round(budgetDelta).toLocaleString()} under budget — consider locking that in for travel savings.`,
        variant: 'positive',
        icon: 'sparkles',
      });
    } else if (budgetDelta < 0) {
      const overAmount = Math.abs(Math.round(budgetDelta));
      notes.push({
        slug: 'budget-over',
        title: 'Budget overshoot',
        message: `Spending is tracking $${overAmount.toLocaleString()} above your target. Trim a category to stay flight-ready.`,
        variant: 'warning',
        icon: 'alert',
        actionLabel: 'Adjust budget focus',
        actionHref: '/settings',
      });
    }
  }

  if (Number.isFinite(savingsGoal) && Number.isFinite(budgetDelta)) {
    const progress = savingsGoal - (budgetDelta < 0 ? Math.abs(budgetDelta) : 0);
    if (progress > 0 && progress < savingsGoal) {
      notes.push({
        slug: 'savings-progress',
        title: 'Savings goal check-in',
        message: `You’re ${Math.round((progress / savingsGoal) * 100)}% of the way to your $${Math.round(savingsGoal).toLocaleString()} monthly goal.`,
        variant: 'info',
        icon: 'target',
      });
    }
  }

  const topCategoryEntry = Object.entries(totals ?? {})
    .filter(([_, value]) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1])[0];

  if (topCategoryEntry) {
    const [category, value] = topCategoryEntry;
    const formatted = Math.round(Number(value) ?? 0).toLocaleString();
    const watched = categorySet.has(category);
    notes.push({
      slug: `category-${category.toLowerCase()}`,
      title: `${category} spotlight`,
      message: `You’ve put $${formatted} into ${category} this month${watched ? ' — right on theme for your favourites.' : '.'}`,
      variant: watched ? 'positive' : 'info',
      icon: 'chart-pie',
      actionLabel: 'See category detail',
      actionHref: '/insights',
    });
  }

  if (notes.length === 0 && interestSet.size > 0) {
    notes.push({
      slug: 'interests-reminder',
      title: 'Personalize more',
      message: `Tell us more about your travel vibe so GeoBudget can surface hidden gems.`,
      variant: 'info',
      icon: 'sparkles',
      actionLabel: 'Update interests',
      actionHref: '/settings',
    });
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

  const savingsGoal = useMemo(() => {
    if (personalization?.monthlyBudgetGoal) return personalization.monthlyBudgetGoal;
    if (profile?.monthlyBudgetGoal) return profile.monthlyBudgetGoal;
    return null;
  }, [personalization?.monthlyBudgetGoal, profile?.monthlyBudgetGoal]);

  const { transactions, recent, spendingMetrics, totals } = useTransactions({
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

  const [storedNudges, setStoredNudges] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setStoredNudges([]);
      return () => {
        cancelled = true;
      };
    }

    fetchRecentNudges(userId, { limit: 12 })
      .then((fetched) => {
        if (!cancelled) {
          setStoredNudges(fetched ?? []);
        }
      })
      .catch((error) => console.warn('Failed to load persisted nudges', error));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const topDestinations = useMemo(() => {
    if (!Array.isArray(rankedBySavings)) return [];
    const focus = personalization?.budgetFocus ?? 'Balanced';
    const interestSet = new Set((personalization?.travelInterests ?? []).map((interest) => interest.toLowerCase()));
    const continentSet = new Set((personalization?.preferredContinents ?? []).map((c) => c.toLowerCase()));
    const categorySet = new Set((personalization?.favoriteCategories ?? []).map((c) => c.toLowerCase()));

    return rankedBySavings
      .filter((city) => {
        if (interestSet.size > 0 && !(city.interests ?? []).some((interest) => interestSet.has(interest.toLowerCase()))) {
          return false;
        }
        if (continentSet.size > 0 && city.continent) {
          if (!continentSet.has(String(city.continent).toLowerCase())) {
            return false;
          }
        }
        if (categorySet.size > 0 && !(city.categories ?? []).some((category) => categorySet.has(category.toLowerCase()))) {
          return false;
        }
        return true;
      })
      .slice(0, 6)
      .map((city) => ({
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
  }, [rankedBySavings, personalization?.budgetFocus, personalization?.travelInterests, personalization?.preferredContinents, personalization?.favoriteCategories, baseMonthlyBudget]);

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

  const pppTop = topDestinations.slice(0, 3);

  const budgetStatus = useMemo(() => {
    const delta = spendingMetrics?.budgetDelta;
    if (!Number.isFinite(delta)) return null;
    if (delta > 0) {
      return {
        variant: 'positive',
        message: `You’re on track to bank $${Math.round(delta).toLocaleString()} this month.`,
      };
    }
    if (delta < 0) {
      return {
        variant: 'warning',
        message: `Spending is trending $${Math.abs(Math.round(delta)).toLocaleString()} over plan.`,
      };
    }
    return null;
  }, [spendingMetrics?.budgetDelta]);

  const notifications = useMemo(
    () =>
      buildNotifications({
        bestCity: topDestinations[0],
        runnerUp: topDestinations[1],
        weeklyChange,
        budgetDelta: spendingMetrics?.budgetDelta ?? null,
        savingsGoal,
        totals,
        personalization,
      }),
    [personalization, savingsGoal, spendingMetrics?.budgetDelta, topDestinations, totals, weeklyChange]
  );

  useEffect(() => {
    if (!userId || notifications.length === 0) {
      return;
    }

    upsertNudges(userId, notifications).catch((error) => {
      console.warn('Unable to persist nudges', error);
    });
  }, [notifications, userId]);

  const combinedNudges = useMemo(() => {
    const map = new Map();
    storedNudges.forEach((nudge, index) => {
      const key = nudge?.slug ?? `stored-${index}`;
      map.set(key, nudge);
    });
    notifications.forEach((nudge, index) => {
      const key = nudge?.slug ?? `generated-${index}`;
      map.set(key, nudge);
    });
    return Array.from(map.values());
  }, [notifications, storedNudges]);

  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Here’s how $${Number(baseMonthlyBudget).toLocaleString()}/month stretches across the globe.`
    : 'Let’s see how your money travels.';

  const showOnboarding = !personalizationLoading && !personalization?.onboardingComplete;
  const handleOnboardingComplete = async (payload) => {
    await completeOnboarding(payload);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <OnboardingModal
        isOpen={showOnboarding}
        defaultValues={personalization}
        onComplete={handleOnboardingComplete}
        onSkip={() => completeOnboarding({ ...personalization, onboardingComplete: true })}
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
            {budgetStatus && (
              <div
                className={`mt-4 inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ${
                  budgetStatus.variant === 'positive' ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'
                }`}
              >
                {budgetStatus.message}
              </div>
            )}
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
                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getCategoryStyles(
                        txn.category
                      )}`}
                    >
                      {txn.category ?? 'General'}
                    </span>
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

        <NotificationsWidget items={combinedNudges} />
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
          <SavingsRunwayPanel destinations={topDestinations} stayLengthMonths={6} />
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
                  savingsPct={dest.savings ?? dest.savingsPct}
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
