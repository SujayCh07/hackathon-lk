import { useEffect, useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import { Link } from 'react-router-dom';

// Debounce hook
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

export function Planner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { balanceUSD } = useAccount();
  const { cities, calculateRunway, isLoading: citiesLoading } = usePPP();

  const [budget, setBudget] = useState(2500);
  const [runwayData, setRunwayData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortOption, setSortOption] = useState('az');

  const debouncedBudget = useDebounce(budget, 300);

  // Load user's saved budget
  useEffect(() => {
    const saved = profile?.monthlyBudget;
    if (!profileLoading && typeof saved === 'number' && Number.isFinite(saved)) {
      setBudget(saved);
    }
  }, [profile, profileLoading]);

  // Calculate runway when budget or cities change
  useEffect(() => {
    if (!debouncedBudget || cities.length === 0) return;

    let cancelled = false;

    async function compute() {
      setIsCalculating(true);

      try {
        const results = await Promise.all(
          cities.map(async (city) => {
            const runway = await calculateRunway(debouncedBudget, 'United States', city.country, city.monthlyCost);
            return {
              city: city.city,
              runway: Number.isFinite(runway) ? runway : 0,
              monthlyCost: city.monthlyCost,
              currency: city.currency,
            };
          })
        );

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
  }, [debouncedBudget, cities, calculateRunway]);

  // Filtering and sorting
  const filteredAndSortedData = useMemo(() => {
    let data = runwayData;

    // Filter by search term (case insensitive)
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter((entry) => entry.city.toLowerCase().includes(lowerTerm));
    }

    // Filter by max price (if a valid number)
    const maxPriceNum = parseFloat(maxPriceFilter);
    if (!isNaN(maxPriceNum)) {
      data = data.filter((entry) => entry.monthlyCost <= maxPriceNum);
    }

    // Sort
    switch (sortOption) {
      case 'az':
        data = data.slice().sort((a, b) => a.city.localeCompare(b.city));
        break;
      case 'za':
        data = data.slice().sort((a, b) => b.city.localeCompare(a.city));
        break;
      case 'price-asc':
        data = data.slice().sort((a, b) => a.monthlyCost - b.monthlyCost);
        break;
      case 'price-desc':
        data = data.slice().sort((a, b) => b.monthlyCost - a.monthlyCost);
        break;
      default:
        break;
    }

    return data;
  }, [runwayData, searchTerm, maxPriceFilter, sortOption]);

  // Find the best-value city (max runway)
  const highlightCity = useMemo(() => {
    return filteredAndSortedData.reduce(
      (best, current) => (current.runway > best.runway ? current : best),
      { city: 'No data', runway: 0, monthlyCost: 0, currency: 'USD' }
    );
  }, [filteredAndSortedData]);

  // Format price helper - never show 0, use decimals as needed
  function formatPrice(value) {
    if (!value || value <= 0) return 'N/A';
    // Show decimals only if needed, max 2 decimals
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
          </div>
          <div className="flex flex-col items-start gap-2 text-sm font-semibold text-teal md:items-end">
            <div className="rounded-2xl bg-turquoise/15 px-4 py-2 shadow-sm shadow-teal/10">
              Monthly budget: {formatPrice(budget)}
              {isCalculating && <span className="ml-2 text-xs opacity-70">(calculating...)</span>}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-2 text-teal/80 shadow-sm shadow-white/40">
              Available balance: {formatPrice(balanceUSD)}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <BudgetSlider value={budget} onChange={setBudget} />

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
              <option value="az">Sort A-Z</option>
              <option value="za">Sort Z-A</option>
              <option value="price-asc">Price (low to high)</option>
              <option value="price-desc">Price (high to low)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Highlight city info */}
      {highlightCity.city !== 'No data' && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal">
          With a{' '}
          <strong>{formatPrice(budget)}</strong> monthly budget,{' '}
          <strong>{highlightCity.city}</strong> gives you the most value — your budget lasts{' '}
          <strong>{Number.isFinite(highlightCity.runway) ? highlightCity.runway.toFixed(1) : 'N/A'} months</strong> there.
        </div>
      )}

      {/* Runway cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedData.map((entry) => (
          <RunwayCard
            key={entry.city}
            {...entry}
            monthlyCost={formatPrice(entry.monthlyCost) === 'N/A' ? 'N/A' : entry.monthlyCost}
          />
        ))}
      </div>

      {(isCalculating || citiesLoading) && runwayData.length === 0 && (
        <div className="text-center text-charcoal/60">
          <p>Calculating purchasing power across destinations...</p>
        </div>
      )}
    </div>
  );
}

export default Planner;
