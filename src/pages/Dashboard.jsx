import { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import WorldMap from '../components/score/WorldMap.jsx';
import CityCard from '../components/score/CityCard.jsx';
import SpendingTrendChart from '../components/dashboard/SpendingTrendChart.jsx';
import SavingsRunwayPanel from '../components/dashboard/SavingsRunwayPanel.jsx';
import NotificationsWidget from '../components/dashboard/NotificationsWidget.jsx';
import Progress from '../components/ui/Progress.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import OnboardingModal from '../components/onboarding/OnboardingModal.jsx';
import { fetchRecentNudges, saveNudges, normaliseNudge } from '../lib/nudges.js';

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

const CATEGORY_COLORS = {
  Groceries: 'bg-emerald-100 text-emerald-700',
  Rent: 'bg-orange-100 text-orange-700',
  Transport: 'bg-sky-100 text-sky-700',
  Dining: 'bg-rose-100 text-rose-700',
  Entertainment: 'bg-purple-100 text-purple-700',
  Travel: 'bg-indigo-100 text-indigo-700',
  Utilities: 'bg-amber-100 text-amber-700',
  Healthcare: 'bg-lime-100 text-lime-700',
  Fitness: 'bg-blue-100 text-blue-700',
  General: 'bg-slate-100 text-slate-700',
};

function categoryBadgeClass(category) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.General;
}

function buildNotifications({
  topDestinations = [],
  weeklyChange,
  budgetDelta,
  personalization,
  balanceUSD,
  budgetGoal,
}) {
  const notes = [];

  const [bestCity, runnerUp] = topDestinations;
  if (bestCity && runnerUp) {
    const monthlyDiff = Math.max(0, Number(runnerUp.monthlyCost ?? 0) - Number(bestCity.monthlyCost ?? 0));
    if (monthlyDiff > 0) {
      notes.push({
        message: `Choosing ${bestCity.city} over ${runnerUp.city} frees up ${formatUSD(monthlyDiff)} each month.`,
        subtitle: 'Reallocate that surplus to flights or remote-work upgrades.',
        tone: 'positive',
        category: 'GeoBudget',
        icon: 'sparkles',
        actionLabel: 'Compare in GeoBudget',
        actionHref: '/planner',
        impact: monthlyDiff,
      });
    }
  }

  if (Number.isFinite(weeklyChange)) {
    notes.push({
      message: `Your weekly spend is ${weeklyChange > 0 ? 'up' : 'down'} ${Math.abs(Math.round(weeklyChange))}% versus last week.`,
      subtitle: weeklyChange > 0
        ? 'Nudge: rein in variable categories like dining and rideshares.'
        : 'Momentum check: keep routing that surplus to travel goals.',
      tone: weeklyChange > 0 ? 'caution' : 'positive',
      category: 'Spending trend',
      icon: weeklyChange > 0 ? 'trending-up' : 'trending-down',
      actionLabel: 'Open Insights',
      actionHref: '/insights',
      impact: weeklyChange,
    });
  }

  if (Number.isFinite(budgetDelta)) {
    if (budgetDelta > 0) {
      notes.push({
        message: `You’re pacing ${formatUSD(budgetDelta)} under budget this month.`,
        subtitle: 'Lock it in with an automatic transfer to your travel fund.',
        tone: 'positive',
        category: 'Budget',
        icon: 'piggy-bank',
        actionLabel: 'Adjust savings plan',
        actionHref: 'https://verified.capitalone.com/auth/signin',
        impact: budgetDelta,
      });
    } else if (budgetDelta < 0) {
      notes.push({
        message: `Projected overspend: ${formatUSD(Math.abs(budgetDelta))} above your goal.`,
        subtitle: 'Trim discretionary categories or shorten the next stay length.',
        tone: 'warning',
        category: 'Budget',
        icon: 'warning',
        actionLabel: 'Review transactions',
        actionHref: 'https://verified.capitalone.com/auth/signin',
        impact: budgetDelta,
      });
    }
  }

  if (personalization?.travelInterests?.length && bestCity?.interests?.length) {
    const alignedInterest = bestCity.interests.find((interest) =>
      personalization.travelInterests.some((pref) => pref.toLowerCase() === interest.toLowerCase())
    );
    if (alignedInterest) {
      notes.push({
        message: `${bestCity.city} hits your “${alignedInterest}” interest with ${bestCity.savings?.toFixed?.(0) ?? 0}% better PPP.`,
        subtitle: 'Mark it as a favourite to surface more picks like this.',
        tone: 'info',
        category: 'Personalisation',
        icon: 'star',
        actionLabel: 'Save to wishlist',
        actionHref: '/budget',
      });
    }
  }

  if (Number.isFinite(balanceUSD) && Number.isFinite(budgetGoal) && budgetGoal > 0) {
    const coverage = balanceUSD / budgetGoal;
    notes.push({
      message: `Your current balance covers roughly ${coverage.toFixed(1)} months of your target lifestyle.`,
      subtitle: 'Keep topping up to extend your runway before your next move.',
      tone: 'info',
      category: 'Runway',
      icon: 'globe',
      actionLabel: 'Plan next stay',
      actionHref: 'https://capitalonetravel.com/?external_id=WWW_XXXXX_XXX_SEM-Brand_Google_ZZ_ZZ_T_TravelPortal_ZZ__kenshoo_clickid__86221&target_id=kwd-526220852637&oC=hNXpu38C0E&gad_source=1&gad_campaignid=16246474980&gbraid=0AAAAAD-_MFp4czKtl-CkFmNlt8dmJ0Vy5&gclid=CjwKCAjwlt7GBhAvEiwAKal0cj3dmo92ZGl912aZnKTyk9c0RdMQWdftOKsUk7wM_590zVWTeoNnDBoC8zAQAvD_BwE',
      impact: coverage,
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
    const personalGoal = personalization?.monthlyBudgetGoal ?? personalization?.monthlyBudget;
    if (typeof personalGoal === 'number' && Number.isFinite(personalGoal)) {
      return personalGoal;
    }
    const profileGoal = profile?.monthlyBudgetGoal ?? profile?.monthlyBudget;
    if (typeof profileGoal === 'number' && Number.isFinite(profileGoal)) {
      return profileGoal;
    }
    return 2500;
  }, [
    personalization?.monthlyBudgetGoal,
    personalization?.monthlyBudget,
    profile?.monthlyBudgetGoal,
    profile?.monthlyBudget,
  ]);

  const [persistedNudges, setPersistedNudges] = useState([]);

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

  useEffect(() => {
    if (!userId) {
      setPersistedNudges([]);
      return;
    }

    let active = true;
    fetchRecentNudges(userId)
      .then((rows) => {
        if (!active) return;
        const normalised = rows.map(normaliseNudge).filter(Boolean);
        setPersistedNudges(normalised);
      })
      .catch((cause) => {
        console.warn('Unable to load stored nudges', cause);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const topDestinations = useMemo(() => {
    if (!Array.isArray(rankedBySavings)) return [];

    const interestSet = new Set((personalization?.travelInterests ?? []).map((item) => item.toLowerCase()));
    const continentSet = new Set((personalization?.preferredContinents ?? []).map((item) => item.toLowerCase()));
    const categorySet = new Set((personalization?.favoriteCategories ?? []).map((item) => item.toLowerCase()));
    const focus = personalization?.budgetFocus ?? 'Balanced';

    const filtered = rankedBySavings.filter((city) => {
      const matchesInterest =
        interestSet.size === 0 ||
        (Array.isArray(city.interests) && city.interests.some((interest) => interestSet.has(interest.toLowerCase())));
      const matchesContinent =
        continentSet.size === 0 ||
        (typeof city.continent === 'string' && continentSet.has(city.continent.toLowerCase()));
      const matchesCategory =
        categorySet.size === 0 ||
        (Array.isArray(city.categoryTags) && city.categoryTags.some((category) => categorySet.has(category.toLowerCase())));
      return matchesInterest && matchesContinent && matchesCategory;
    });

    const source = filtered.length > 0 ? filtered : rankedBySavings;

    return source.slice(0, 6).map((city) => {
      const runwayMonths =
        Number.isFinite(city.monthlyCost) && city.monthlyCost > 0 && Number.isFinite(baseMonthlyBudget)
          ? baseMonthlyBudget / city.monthlyCost
          : null;

      const interestContext = Array.isArray(city.interests)
        ? city.interests.find((interest) => interestSet.has(interest.toLowerCase()))
        : null;

      let context = 'Balanced cost profile';
      if (interestContext) {
        context = `Made for ${interestContext.toLowerCase()}`;
      } else if (focus === 'Rent') {
        context = 'Rent advantage vs. your city';
      } else if (focus === 'Food') {
        context = 'Food scene stretches further';
      } else if (focus === 'Leisure') {
        context = 'Leisure budget goes further';
      }

      return {
        ...city,
        city: toTitleCase(city.city ?? ''),
        continent: city.continent ? toTitleCase(city.continent) : null,
        context,
        runwayMonths,
      };
    });
  }, [
    rankedBySavings,
    personalization?.travelInterests,
    personalization?.preferredContinents,
    personalization?.favoriteCategories,
    personalization?.budgetFocus,
    baseMonthlyBudget,
  ]);

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
    if (!Number.isFinite(baseMonthlyBudget) || baseMonthlyBudget <= 0) return null;
    const delta = balanceUSD - baseMonthlyBudget;
    const ratio = (balanceUSD / baseMonthlyBudget) * 100;
    if (!Number.isFinite(ratio)) return null;
    if (delta >= 0) {
      return {
        tone: 'positive',
        ratio,
        message: `Ahead by ${formatUSD(delta)} versus your ${formatUSD(baseMonthlyBudget)} goal.`,
      };
    }
    return {
      tone: 'warning',
      ratio,
      message: `Short ${formatUSD(Math.abs(delta))} of your ${formatUSD(baseMonthlyBudget)} target.`,
    };
  }, [baseMonthlyBudget, balanceUSD]);

  const balanceProgress = useMemo(() => {
    if (!Number.isFinite(baseMonthlyBudget) || baseMonthlyBudget <= 0) return 0;
    const pct = (balanceUSD / baseMonthlyBudget) * 100;
    return Math.max(0, Math.min(200, pct));
  }, [balanceUSD, baseMonthlyBudget]);

  const nudgeCards = useMemo(
    () =>
      buildNotifications({
        topDestinations,
        weeklyChange,
        budgetDelta: spendingMetrics?.budgetDelta ?? null,
        personalization,
        balanceUSD,
        budgetGoal: baseMonthlyBudget,
      }),
    [
      topDestinations,
      weeklyChange,
      spendingMetrics?.budgetDelta,
      personalization,
      balanceUSD,
      baseMonthlyBudget,
    ]
  );

  useEffect(() => {
    if (!userId || nudgeCards.length === 0) return;
    let cancelled = false;

    saveNudges(userId, nudgeCards)
      .then((rows) => {
        if (cancelled || !rows) return;
        const normalised = rows.map(normaliseNudge).filter(Boolean);
        if (normalised.length > 0) {
          setPersistedNudges(normalised);
        }
      })
      .catch((cause) => {
        console.warn('Unable to persist nudges', cause);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, nudgeCards]);

  const displayedNudges = persistedNudges.length > 0 ? persistedNudges : nudgeCards;

  const heroLabel = displayName ? `${displayName.split(' ')[0]}'s budget` : 'Your budget';
  const heroSubtitle = baseMonthlyBudget
    ? `Goal: ${formatUSD(baseMonthlyBudget)} each month · Balance synced from Nessie.`
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
            {Number.isFinite(balanceProgress) && (
              <div className="mt-4 space-y-2">
                <Progress
                  value={balanceProgress}
                  color={budgetStatus?.tone === 'warning' ? 'bg-coral' : 'bg-teal'}
                />
                {budgetStatus && (
                  <p
                    className={`text-xs ${
                      budgetStatus.tone === 'warning' ? 'text-coral' : 'text-teal'
                    }`}
                  >
                    {budgetStatus.message}
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-charcoal/50">Parity maps your runway, nudges, and PPP opportunities.</p>
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
                  className="rounded-2xl bg-offwhite/90 px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-charcoal">{txn.merchant ?? 'Unknown merchant'}</p>
                        {txn.origin === 'nessie' && (
                          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal">
                            Synced
                          </span>
                        )}
                      </div>
                      {txn.description && (
                        <p className="mt-1 text-xs text-charcoal/60">{txn.description}</p>
                      )}
                      <p className="mt-1 text-xs text-charcoal/50">
                        {new Date(txn.timestamp ?? txn.date ?? Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-semibold text-coral">
                        {`${txn.amount >= 0 ? '' : '-'}${formatUSD(Math.abs(txn.amount))}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${categoryBadgeClass(
                            txn.category ?? 'General'
                          )}`}
                        >
                          {txn.category ?? 'General'}
                        </span>
                        {Number.isFinite(txn.categoryConfidence) && (
                          <span className="text-[0.65rem] text-charcoal/60">
                            {(txn.categoryConfidence * 100).toFixed(0)}% match
                          </span>
                        )}
                      </div>
                    </div>
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

        <NotificationsWidget items={displayedNudges} />
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
