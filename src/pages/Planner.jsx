import { useEffect, useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { Link } from 'react-router-dom';

export function Planner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { balanceUSD } = useAccount();
  const { cities, calculateRunway } = usePPP();
  const [budget, setBudget] = useState(2500);

  const savedBudget =
    typeof profile?.monthlyBudget === 'number' && Number.isFinite(profile.monthlyBudget)
      ? profile.monthlyBudget
      : null;

  useEffect(() => {
    if (profileLoading) {
      return;
    }

    if (savedBudget != null) {
      setBudget(savedBudget);
    }
  }, [profileLoading, savedBudget]);

  const runwayData = useMemo(() => {
    return cities.map((city) => {
      /*const calculateRunway: (monthlyBudgetUSD: any, fromCountry: any, toCountry: any, monthlyCostInTargetCountry: any) => Promise<number>
  */
      const runwayMonths = calculateRunway(budget, "Portugal", city.country, city.monthlyCost);
      return {
        city: city.city,
        runway: runwayMonths,
        monthlyCost: city.monthlyCost,
        currency: city.currency
      };
    });
  }, [budget, calculateRunway, cities]);

  const highlightCity = useMemo(() => {
    return runwayData.reduce(
      (best, current) => (current.runway > best.runway ? current : best),
      { city: 'Lisbon', runway: 0, monthlyCost: 0, currency: 'USD' }
    );
  }, [runwayData]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>GeoBudget planner</CardTitle>
            <p className="text-sm text-charcoal/70">
              Adjust your monthly spend target to understand how far your money stretches in each destination.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm font-semibold text-teal md:items-end">
            <div className="rounded-2xl bg-turquoise/15 px-4 py-2 shadow-sm shadow-teal/10">
              Monthly budget: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget)}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-2 text-teal/80 shadow-sm shadow-white/40">
              Available balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balanceUSD)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BudgetSlider value={budget} onChange={setBudget} />
          <div className="mt-4 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-xs text-charcoal/70 shadow-inner shadow-white/40">
            {profileLoading ? (
              <span>Loading your saved preferences…</span>
            ) : savedBudget != null ? (
              <span>
                Using your saved monthly budget from{' '}
                <Link to="/settings" className="font-semibold text-teal hover:underline">
                  Settings
                </Link>{' '}
                ({new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(savedBudget)}).
              </span>
            ) : (
              <span>
                Set a monthly budget in{' '}
                <Link to="/settings" className="font-semibold text-teal hover:underline">
                  Settings
                </Link>{' '}
                to personalise this planner.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      {runwayData.length > 0 && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal">
          With a {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget)} monthly budget, {highlightCity.city}
          {' '}
          stretches your spending power the furthest at {highlightCity.runway.toFixed(1)} months of local living costs.
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {runwayData.map((entry) => (
          <RunwayCard key={entry.city} {...entry} />
        ))}
      </div>
    </div>
  );
}

export default Planner;
