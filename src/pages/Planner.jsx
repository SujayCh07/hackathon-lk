import { useEffect, useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';

// ✅ Import the dictionary
import Dictionary from './Dictionary.js';

// Debounce hook
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function capitalizeFirstWord(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function Planner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { data: personalization } = usePersonalization(userId);
  const { balanceUSD } = useAccount();

  const [budget, setBudget] = useState(2500);
  const [runwayData, setRunwayData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortOption, setSortOption] = useState('runway');
  const [stayDuration, setStayDuration] = useState(6);

  const debouncedBudget = useDebounce(budget, 300);

  // Load user’s saved budget
  useEffect(() => {
    const saved = profile?.monthlyBudget;
    if (!profileLoading && typeof saved === 'number' && Number.isFinite(saved)) {
      setBudget(saved);
    }
  }, [profile, profileLoading]);

  // Calculate runway data using Dictionary.js
  useEffect(() => {
    if (!debouncedBudget) return;

    let cancelled = false;

    async function compute() {
      setIsCalculating(true);

      try {
        // Loop through all dictionary entries
        const results = Object.entries(Dictionary).map(([country, values]) => {
          const monthlyCost = values.cost_of_living;
          const runway = monthlyCost > 0 ? debouncedBudget / monthlyCost : 0;

          return {
            city: country.charAt(0).toUpperCase() + country.slice(1), // title-case country
            country,
            runway: Number.isFinite(runway) ? runway : 0,
            monthlyCost,
            currency: 'USD',
          };
        });

        if (!cancelled) {
          setRunwayData(results);
        }
      } catch (error) {
        console.error('Error computing runways:', error);
        if (!cancelled) setRunwayData([]);
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }

    compute();

    return () => {
      cancelled = true;
    };
  }, [debouncedBudget]);

  // Curious cities
  const curiousCities = useMemo(() => {
    if (!personalization?.curiousCities) return [];
    return personalization.curiousCities.map((city) => city.toLowerCase());
  }, [personalization?.curiousCities]);

  const focus = personalization?.budgetFocus ?? 'Balanced';
  const focusBreakdown = useMemo(() => {
    const base = { Rent: 0.45, Food: 0.25, Transport: 0.15, Leisure: 0.15 };
    switch (focus) {
      case 'Rent':
        return { ...base, Rent: 0.55, Leisure: 0.1 };
      case 'Food':
        return { ...base, Food: 0.4, Leisure: 0.1 };
      case 'Leisure':
        return { ...base, Leisure: 0.35, Rent: 0.35 };
      default:
        return base;
    }
  }, [focus]);

  // Filtering & sorting
  const filteredAndSortedData = useMemo(() => {
    let data = runwayData.map((entry) => ({
      ...entry,
      isCurious: curiousCities.some((city) =>
        entry.city.toLowerCase().includes(city)
      ),
      breakdown: focusBreakdown,
    }));

    // Search
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter((entry) =>
        entry.city.toLowerCase().includes(lowerTerm)
      );
    }

    // Max price filter
    const maxPriceNum = parseFloat(maxPriceFilter);
    if (!isNaN(maxPriceNum)) {
      data = data.filter((entry) => entry.monthlyCost <= maxPriceNum);
    }

    // Sorting
    switch (sortOption) {
      case 'affordable':
        data = data.slice().sort((a, b) => a.monthlyCost - b.monthlyCost);
        break;
      case 'runway':
        data = data.slice().sort((a, b) => b.runway - a.runway);
        break;
      case 'closest':
        data = data
          .slice()
          .sort(
            (a, b) =>
              Math.abs(a.monthlyCost - budget) -
              Math.abs(b.monthlyCost - budget)
          );
        break;
      case 'az':
        data = data.slice().sort((a, b) => a.city.localeCompare(b.city));
        break;
      case 'za':
        data = data.slice().sort((a, b) => b.city.localeCompare(a.city));
        break;
      default:
        break;
    }

    return data;
  }, [runwayData, searchTerm, maxPriceFilter, sortOption, curiousCities, focusBreakdown, budget]);

  // Highlight best city
  const highlightCity = useMemo(() => {
    return filteredAndSortedData.reduce(
      (best, current) =>
        current.runway > best.runway ? current : best,
      { city: 'No data', runway: 0, monthlyCost: 0, currency: 'USD' }
    );
  }, [filteredAndSortedData]);

  function formatPrice(value) {
    if (!value || value <= 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>GeoBudget planner</CardTitle>
            <p className="text-sm text-charcoal/70">
              Adjust your monthly spend target to understand how far your money stretches in each destination.
            </p>
            <p className="mt-1 text-xs text-charcoal/60">
              GeoBudget = plan your travels with budget forecasting.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm font-semibold text-teal md:items-end">
            <div className="rounded-2xl bg-turquoise/15 px-4 py-2 shadow-sm shadow-teal/10">
              Monthly budget: {formatPrice(budget)}
              {isCalculating && (
                <span className="ml-2 text-xs opacity-70">
                  (calculating…)
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-2 text-teal/80 shadow-sm shadow-white/40">
              Available balance: {formatPrice(balanceUSD)}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <BudgetSlider value={budget} onChange={setBudget} />

          {/* Stay duration */}
          <div className="mt-6 rounded-3xl border border-teal/30 bg-turquoise/10 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal">
                  Stay duration timeline
                </p>
                <p className="text-xs text-charcoal/60">
                  Drag to see how long your savings last across destinations.
                </p>
              </div>
              <span className="text-sm font-semibold text-teal">
                {stayDuration} months
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={36}
              value={stayDuration}
              onChange={(event) =>
                setStayDuration(Number(event.target.value))
              }
              className="mt-3 h-2 w-full appearance-none rounded-full bg-teal/30 accent-teal"
            />
          </div>

          {/* Search, filter, sort */}
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <input
              type="text"
              placeholder="Search city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
              aria-label="Search city"
            />

            <input
              type="number"
              min={0}
              placeholder="Max monthly price (USD)"
              value={maxPriceFilter}
              onChange={(e) => setMaxPriceFilter(e.target.value)}
              className="w-48 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder-gray-400"
              aria-label="Max monthly price filter"
            />

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-56 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              aria-label="Sort options"
            >
              <option value="runway">Longest runway</option>
              <option value="affordable">Most affordable</option>
              <option value="closest">Closest match to my budget</option>
              <option value="az">City A-Z</option>
              <option value="za">City Z-A</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Highlight city */}
      {highlightCity.city !== 'No data' && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal">
          With a <strong>{formatPrice(budget)}</strong> monthly budget,{' '}
          <strong>{highlightCity.city}</strong> gives you the most value — your budget lasts{' '}
          <strong>
            {Number.isFinite(highlightCity.runway)
              ? highlightCity.runway.toFixed(1)
              : 'N/A'} months
          </strong>{' '}
          there. Plan a {stayDuration}-month stay for around{' '}
          <strong>
            {Number.isFinite(highlightCity.monthlyCost)
              ? formatPrice(highlightCity.monthlyCost * stayDuration)
              : 'N/A'}
          </strong>
          .
        </div>
      )}

      {/* Runway cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedData.map((entry) => (
          <RunwayCard
            key={entry.city}
            {...entry}
            stayDurationMonths={stayDuration}
            isHighlighted={entry.city === highlightCity.city}
            badgeLabel={
              entry.isCurious
                ? 'On your wishlist'
                : entry.city === highlightCity.city
                ? 'Best pick'
                : null
            }
          />
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
