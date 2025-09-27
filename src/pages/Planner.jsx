import { useEffect, useMemo, useState, useCallback } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { Link } from 'react-router-dom';

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function Planner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { balanceUSD } = useAccount();
  const { cities, calculateRunway } = usePPP();
  const [budget, setBudget] = useState(2500);
  const [runwayData, setRunwayData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Debounce the budget to avoid excessive calculations while sliding
  const debouncedBudget = useDebounce(budget, 300); // Wait 300ms after user stops sliding

  const savedBudget =
    typeof profile?.monthlyBudget === 'number' && Number.isFinite(profile.monthlyBudget)
      ? profile.monthlyBudget
      : null;

  // Sync saved budget once profile is loaded
  useEffect(() => {
    if (!profileLoading && savedBudget != null) {
      setBudget(savedBudget);
    }
  }, [profileLoading, savedBudget]);

  // Memoized calculation function to prevent recreating on every render
  const computeRunways = useCallback(async (budgetAmount) => {
    if (!budgetAmount || cities.length === 0) {
      return [];
    }

    console.log(`Computing runways for ${cities.length} cities with $${budgetAmount} budget`);
    setIsCalculating(true);
    
    try {
      const results = await Promise.all(
        cities.map(async (city) => {
          const runway = await calculateRunway(budgetAmount, 'United States', city.country, city.monthlyCost);
          return {
            city: city.city,
            runway: typeof runway === 'number' ? runway : 0,
            monthlyCost: city.monthlyCost,
            currency: city.currency
          };
        })
      );
      
      console.log('Runway results:', results.slice(0, 3));
      return results;
    } catch (error) {
      console.error('Error computing runways:', error);
      return [];
    } finally {
      setIsCalculating(false);
    }
  }, [cities, calculateRunway]);

  // Calculate runway data based on debounced budget
  useEffect(() => {
    let isCancelled = false;

    const updateRunways = async () => {
      const results = await computeRunways(debouncedBudget);
      if (!isCancelled) {
        setRunwayData(results);
      }
    };

    updateRunways();

    // Cleanup function to prevent setting state if component unmounted
    return () => {
      isCancelled = true;
    };
  }, [debouncedBudget, computeRunways]);

  const highlightCity = useMemo(() => {
    return runwayData.reduce(
      (best, current) => (current.runway > best.runway ? current : best),
      { city: 'No data', runway: 0, monthlyCost: 0, currency: 'USD' }
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
              {isCalculating && <span className="ml-2 text-xs opacity-70">(calculating...)</span>}
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
          With a {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget)} monthly budget,
          {' '}
          <strong>{highlightCity.city}</strong> gives you the most value — your budget lasts <strong>{highlightCity.runway.toFixed(1)} months</strong> there.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {runwayData.map((entry) => (
          <RunwayCard key={entry.city} {...entry} />
        ))}
      </div>

      {isCalculating && runwayData.length === 0 && (
        <div className="text-center text-charcoal/60">
          <p>Calculating purchasing power across destinations...</p>
        </div>
      )}
    </div>
  );
}

export default Planner;