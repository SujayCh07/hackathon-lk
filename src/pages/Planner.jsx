import { useCallback, useEffect, useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import Dictionary from './Dictionary.js';

const CONTINENT_GROUPS = {
  Africa: ['algeria', 'angola', 'egypt', 'ghana', 'kenya', 'morocco', 'nigeria', 'south africa', 'tunisia', 'uganda', 'zambia', 'zimbabwe'],
  Asia: ['china', 'india', 'indonesia', 'japan', 'malaysia', 'philippines', 'singapore', 'south korea', 'taiwan', 'thailand', 'turkey', 'vietnam'],
  Europe: ['austria', 'belgium', 'france', 'germany', 'greece', 'ireland', 'italy', 'netherlands', 'norway', 'poland', 'portugal', 'spain', 'sweden', 'switzerland', 'united kingdom'],
  'North America': ['canada', 'costa rica', 'dominican republic', 'mexico', 'panama', 'united states'],
  'South America': ['argentina', 'brazil', 'chile', 'colombia', 'ecuador', 'peru', 'uruguay'],
  Oceania: ['australia', 'fiji', 'new zealand'],
};

function normalizeKey(value) {
  return value?.toLowerCase?.() ?? '';
}

function getContinent(countryKey) {
  const normalized = normalizeKey(countryKey);
  return (
    Object.entries(CONTINENT_GROUPS).find(([, list]) => list.includes(normalized))?.[0] ??
    'Global'
  );
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
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
  const [continentFilter, setContinentFilter] = useState('All');
  const [maxMonthlyCost, setMaxMonthlyCost] = useState(null);
  const [sortOption, setSortOption] = useState('cost-asc');
  const [stayDuration, setStayDuration] = useState(6);
  const [timeUnit, setTimeUnit] = useState('months'); // 'months' or 'days'

  const formatLocationName = useCallback((value) => {
    return String(value)
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const debouncedBudget = useDebounce(budget, 300);

  const formatPrice = useCallback((value) => {
    if (!value || value <= 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);

  useEffect(() => {
    const saved = profile?.monthlyBudget;
    if (!profileLoading && typeof saved === 'number' && Number.isFinite(saved)) {
      setBudget(saved);
      setMaxMonthlyCost(null); // show all by default
    }
  }, [profile, profileLoading]);

  const fetchRunwayData = useCallback(async () => {
    setIsCalculating(true);

    try {
      const results = Object.entries(Dictionary).map(([country, values]) => {
        const monthlyCost = values.cost_of_living;
        const dailyCost = monthlyCost / 30;

        let runway;
        if (timeUnit === 'days') {
          runway = dailyCost > 0 ? debouncedBudget / dailyCost : 0;
        } else {
          runway = monthlyCost > 0 ? debouncedBudget / monthlyCost : 0;
        }

        const continent = getContinent(country);

        return {
          city: formatLocationName(country),
          country,
          runway: Number.isFinite(runway) ? runway : 0,
          monthlyCost,
          dailyCost,
          currency: 'USD',
          continent,
          timeUnit,
        };
      });

      setRunwayData(results);
    } catch (error) {
      console.error('Error computing runways:', error);
      setRunwayData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [debouncedBudget, formatLocationName, timeUnit]);

  useEffect(() => {
    if (!debouncedBudget) return;
    fetchRunwayData();
  }, [debouncedBudget, fetchRunwayData]);

  const curiousCities = useMemo(() => {
    if (!personalization?.curiousCities) return [];
    return personalization.curiousCities.map((city) => normalizeKey(city));
  }, [personalization?.curiousCities]);

  const filteredAndSortedData = useMemo(() => {
    let data = runwayData.map((entry) => ({
      ...entry,
      isCurious: curiousCities.some((city) => entry.city.toLowerCase().includes(city)),
    }));

    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(
        (entry) =>
          entry.city.toLowerCase().includes(lowerTerm) ||
          entry.country.toLowerCase().includes(lowerTerm)
      );
    }

    if (continentFilter !== 'All') {
      data = data.filter((entry) => entry.continent === continentFilter);
    }

    if (Number.isFinite(maxMonthlyCost)) {
      data = data.filter((entry) => entry.monthlyCost <= maxMonthlyCost);
    }

    switch (sortOption) {
      case 'alpha-asc':
        data = data.slice().sort((a, b) => a.city.localeCompare(b.city));
        break;
      case 'alpha-desc':
        data = data.slice().sort((a, b) => b.city.localeCompare(a.city));
        break;
      case 'cost-asc':
        data = data.slice().sort((a, b) => (a.monthlyCost ?? Infinity) - (b.monthlyCost ?? Infinity));
        break;
      case 'cost-desc':
        data = data.slice().sort((a, b) => (b.monthlyCost ?? 0) - (a.monthlyCost ?? 0));
        break;
      default:
        data = data.slice().sort((a, b) => b.runway - a.runway);
        break;
    }

    return data;
  }, [continentFilter, curiousCities, maxMonthlyCost, runwayData, searchTerm, sortOption]);

  const highlightCity = useMemo(() => {
    return filteredAndSortedData.reduce(
      (best, current) => (current.runway > best.runway ? current : best),
      { city: 'No data', runway: 0, monthlyCost: 0, dailyCost: 0, currency: 'USD' }
    );
  }, [filteredAndSortedData]);

  const handleRefresh = useCallback(() => {
    fetchRunwayData();
  }, [fetchRunwayData]);

  const handleTimeUnitChange = useCallback(
    (newTimeUnit) => {
      setTimeUnit(newTimeUnit);
      if (newTimeUnit === 'days' && timeUnit === 'months') {
        setStayDuration(stayDuration * 30);
      } else if (newTimeUnit === 'months' && timeUnit === 'days') {
        setStayDuration(Math.max(1, Math.round(stayDuration / 30)));
      }
    },
    [stayDuration, timeUnit]
  );

  const getStayDurationSliderProps = () => {
    if (timeUnit === 'days') {
      return {
        min: 1,
        max: 1095,
        step: 1,
        label: `${stayDuration} ${stayDuration === 1 ? 'day' : 'days'}`,
      };
    } else {
      return {
        min: 1,
        max: 36,
        step: 1,
        label: `${stayDuration} ${stayDuration === 1 ? 'month' : 'months'}`,
      };
    }
  };

  const sliderProps = getStayDurationSliderProps();

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
              {isCalculating && <span className="ml-2 text-xs opacity-70">(calculating…)</span>}
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
                <p className="text-xs text-charcoal/60">Drag to see how long your savings last across destinations.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTimeUnitChange('months')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      timeUnit === 'months' ? 'bg-teal text-white' : 'bg-white/50 text-teal hover:bg-white/70'
                    }`}
                  >
                    Months
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeUnitChange('days')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      timeUnit === 'days' ? 'bg-teal text-white' : 'bg-white/50 text-teal hover:bg-white/70'
                    }`}
                  >
                    Days
                  </button>
                </div>
                <span className="text-sm font-semibold text-teal">{sliderProps.label}</span>
              </div>
            </div>
            <input
              type="range"
              min={sliderProps.min}
              max={sliderProps.max}
              step={sliderProps.step}
              value={stayDuration}
              onChange={(event) => setStayDuration(Number(event.target.value))}
              className="mt-3 h-2 w-full appearance-none rounded-full bg-teal/30 accent-teal"
            />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
              <input
                type="text"
                placeholder="Search city or country"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-grow rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal"
                aria-label="Search city"
              />

              <select
                value={continentFilter}
                onChange={(event) => setContinentFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal md:w-52"
                aria-label="Filter by continent"
              >
                <option value="All">All continents</option>
                <option value="Africa">Africa</option>
                <option value="Asia">Asia</option>
                <option value="Europe">Europe</option>
                <option value="North America">North America</option>
                <option value="South America">South America</option>
                <option value="Oceania">Oceania</option>
              </select>

              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal md:w-56"
                aria-label="Sort options"
              >
                <option value="runway">Longest runway</option>
                <option value="alpha-asc">Alphabetical (A–Z)</option>
                <option value="alpha-desc">Alphabetical (Z–A)</option>
                <option value="cost-asc">Monthly cost (low/high)</option>
                <option value="cost-desc">Monthly cost (high/low)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="ml-auto rounded-full border border-transparent bg-teal px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal/90"
              >
                Refresh results
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {highlightCity.city !== 'No data' && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal shadow-inner">
          <p>
            With a <strong>{formatPrice(budget)}</strong> monthly budget,{' '}
            <strong>{highlightCity.city}</strong> gives you the most value — your budget lasts{' '}
            <strong>
              {Number.isFinite(highlightCity.runway)
                ? `${highlightCity.runway.toFixed(1)} ${timeUnit === 'days' ? (highlightCity.runway === 1 ? 'day' : 'days') : (highlightCity.runway === 1 ? 'month' : 'months')}`
                : 'N/A'}
            </strong>{' '}
            there.
          </p>
          <p className="mt-1 font-semibold text-teal/80">
            Plan a {stayDuration}-{timeUnit} stay for{' '}
            {formatPrice(
              timeUnit === 'days'
                ? highlightCity.dailyCost * stayDuration
                : highlightCity.monthlyCost * stayDuration
            )}.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedData.map((entry) => (
          <RunwayCard
            key={entry.city}
            {...entry}
            stayDurationMonths={timeUnit === 'months' ? stayDuration : stayDuration / 30}
            stayDurationDays={timeUnit === 'days' ? stayDuration : stayDuration * 30}
            isHighlighted={entry.city === highlightCity.city}
            badgeLabel={entry.city === highlightCity.city ? 'Best pick' : entry.isCurious ? 'On your wishlist' : null}
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
