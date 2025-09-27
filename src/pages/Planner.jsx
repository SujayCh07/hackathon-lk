import { useEffect, useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import {
  TRAVEL_INTEREST_OPTIONS,
  CONTINENT_OPTIONS,
  CATEGORY_FOCUS_OPTIONS,
} from '../lib/personalizationOptions.js';

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
  const { data: personalization } = usePersonalization(userId);
  const { balanceUSD } = useAccount();
  const { cities, calculateRunway, isLoading: citiesLoading } = usePPP();

  const [budget, setBudget] = useState(2500);
  const [runwayData, setRunwayData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortOption, setSortOption] = useState('runway');
  const [stayDuration, setStayDuration] = useState(6);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedContinents, setSelectedContinents] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filtersInitialised, setFiltersInitialised] = useState(false);

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
              continent: city.continent ?? null,
              interests: Array.isArray(city.interests) ? city.interests : [],
              categories: Array.isArray(city.categoryTags) ? city.categoryTags : [],
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
  const curiousCities = useMemo(() => {
    if (!personalization?.curiousCities) return [];
    return personalization.curiousCities.map((city) => city.toLowerCase());
  }, [personalization?.curiousCities]);

  useEffect(() => {
    if (!personalization || filtersInitialised) return;
    const hasPref =
      (personalization.travelInterests?.length ?? 0) > 0 ||
      (personalization.preferredContinents?.length ?? 0) > 0 ||
      (personalization.favoriteCategories?.length ?? 0) > 0;
    if (hasPref) {
      setSelectedInterests(personalization.travelInterests ?? []);
      setSelectedContinents(personalization.preferredContinents ?? []);
      setSelectedCategories(personalization.favoriteCategories ?? []);
    }
    setFiltersInitialised(true);
  }, [personalization, filtersInitialised]);

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

  const filteredAndSortedData = useMemo(() => {
    const interestSet = new Set((selectedInterests ?? []).map((value) => value.toLowerCase()));
    const continentSet = new Set((selectedContinents ?? []).map((value) => value.toLowerCase()));
    const categorySet = new Set((selectedCategories ?? []).map((value) => value.toLowerCase()));

    let data = runwayData.map((entry) => ({
      ...entry,
      isCurious: curiousCities.some((city) => entry.city.toLowerCase().includes(city)),
      breakdown: focusBreakdown,
    }));

    // Filter by search term (case insensitive)
    if (searchTerm.trim() !== '') {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter((entry) => entry.city.toLowerCase().includes(lowerTerm));
    }

    if (continentSet.size > 0) {
      data = data.filter((entry) => {
        if (!entry.continent) return false;
        return continentSet.has(entry.continent.toLowerCase());
      });
    }

    if (interestSet.size > 0) {
      data = data.filter((entry) => {
        const interests = Array.isArray(entry.interests) ? entry.interests : [];
        return interests.some((interest) => interestSet.has(interest.toLowerCase()));
      });
    }

    if (categorySet.size > 0) {
      data = data.filter((entry) => {
        const categories = Array.isArray(entry.categories) ? entry.categories : [];
        return categories.some((category) => categorySet.has(category.toLowerCase()));
      });
    }

    // Filter by max price (if a valid number)
    const maxPriceNum = parseFloat(maxPriceFilter);
    if (!isNaN(maxPriceNum)) {
      data = data.filter((entry) => entry.monthlyCost <= maxPriceNum);
    }

    // Sort
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
          .sort((a, b) =>
            Math.abs(a.monthlyCost - budget) - Math.abs(b.monthlyCost - budget)
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
            <p className="mt-1 text-xs text-charcoal/60">GeoBudget = plan your travels with budget forecasting.</p>
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

          <div className="mt-6 rounded-3xl border border-teal/30 bg-turquoise/10 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal">Stay duration timeline</p>
                <p className="text-xs text-charcoal/60">
                  Drag to see how long your savings last across destinations.
                </p>
              </div>
              <span className="text-sm font-semibold text-teal">{stayDuration} months</span>
            </div>
            <input
              type="range"
              min={1}
              max={36}
              value={stayDuration}
              onChange={(event) => setStayDuration(Number(event.target.value))}
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

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal/60">Interests</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAVEL_INTEREST_OPTIONS.map((option) => {
                  const isActive = selectedInterests.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSelectedInterests((prev) =>
                          prev.includes(option)
                            ? prev.filter((item) => item !== option)
                            : [...prev, option]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-teal bg-teal/15 text-teal'
                          : 'border-teal/20 bg-white text-charcoal/80 hover:border-teal/50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-coral/60">Continents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTINENT_OPTIONS.map((option) => {
                  const isActive = selectedContinents.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSelectedContinents((prev) =>
                          prev.includes(option)
                            ? prev.filter((item) => item !== option)
                            : [...prev, option]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-coral bg-coral/15 text-coral'
                          : 'border-coral/20 bg-white text-charcoal/80 hover:border-coral/50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-navy/60">Categories</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORY_FOCUS_OPTIONS.map((option) => {
                  const isActive = selectedCategories.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(option)
                            ? prev.filter((item) => item !== option)
                            : [...prev, option]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isActive
                          ? 'border-navy bg-navy/15 text-navy'
                          : 'border-navy/20 bg-white text-charcoal/80 hover:border-navy/40'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
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
          Plan a {stayDuration}-month stay for around{' '}
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
            monthlyCost={entry.monthlyCost}
            stayDurationMonths={stayDuration}
            isHighlighted={entry.city === highlightCity.city}
            badgeLabel={entry.isCurious ? 'On your wishlist' : entry.city === highlightCity.city ? 'Best pick' : null}
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
