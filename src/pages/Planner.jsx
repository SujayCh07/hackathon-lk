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
  Africa: [
    'algeria',
    'angola',
    'benin',
    'botswana',
    'burkina faso',
    'burundi',
    'cameroon',
    'cape verde',
    'central african republic',
    'chad',
    'comoros',
    'democratic republic of the congo',
    'djibouti',
    'egypt',
    'equatorial guinea',
    'eritrea',
    'eswatini',
    'ethiopia',
    'gabon',
    'gambia, the',
    'ghana',
    'guinea',
    'guinea-bissau',
    'ivory coast',
    'kenya',
    'lesotho',
    'liberia',
    'libya',
    'madagascar',
    'malawi',
    'mali',
    'mauritania',
    'mauritius',
    'morocco',
    'mozambique',
    'namibia',
    'niger',
    'nigeria',
    'republic of congo',
    'rwanda',
    'senegal',
    'seychelles',
    'sierra leone',
    'somalia',
    'south africa',
    'south sudan',
    'sudan',
    'tanzania',
    'togo',
    'tunisia',
    'uganda',
    'zambia',
    'zimbabwe',
  ],
  Asia: [
    'afghanistan',
    'armenia',
    'azerbaijan',
    'bahrain',
    'bangladesh',
    'bhutan',
    'brunei',
    'cambodia',
    'china',
    'cyprus',
    'georgia',
    'india',
    'indonesia',
    'iran',
    'iraq',
    'israel',
    'japan',
    'jordan',
    'kazakhstan',
    'kuwait',
    'kyrgyzstan',
    'laos',
    'lebanon',
    'malaysia',
    'maldives',
    'mongolia',
    'myanmar',
    'nepal',
    'north korea',
    'oman',
    'pakistan',
    'palestine',
    'philippines',
    'qatar',
    'saudi arabia',
    'singapore',
    'south korea',
    'sri lanka',
    'syria',
    'taiwan',
    'tajikistan',
    'thailand',
    'timor-leste',
    'turkey',
    'turkmenistan',
    'uae',
    'uzbekistan',
    'vietnam',
    'yemen',
  ],
  Europe: [
    'albania',
    'andorra',
    'austria',
    'belarus',
    'belgium',
    'bosnia and herzegovina',
    'bulgaria',
    'croatia',
    'czech republic',
    'denmark',
    'estonia',
    'finland',
    'france',
    'germany',
    'greece',
    'hungary',
    'iceland',
    'ireland',
    'italy',
    'latvia',
    'liechtenstein',
    'lithuania',
    'luxembourg',
    'malta',
    'moldova',
    'montenegro',
    'netherlands',
    'north macedonia',
    'norway',
    'poland',
    'portugal',
    'romania',
    'serbia',
    'slovakia',
    'slovenia',
    'spain',
    'sweden',
    'switzerland',
    'ukraine',
    'united kingdom',
  ],
  'North America': [
    'antigua and barbuda',
    'bahamas',
    'barbados',
    'belize',
    'canada',
    'costa rica',
    'cuba',
    'dominica',
    'dominican republic',
    'el salvador',
    'grenada',
    'guatemala',
    'haiti',
    'honduras',
    'jamaica',
    'mexico',
    'nicaragua',
    'panama',
    'saint kitts and nevis',
    'saint lucia',
    'saint vincent and the grenadines',
    'trinidad and tobago',
    'united states',
    'united states of america',
  ],
  'South America': [
    'argentina',
    'bolivia',
    'brazil',
    'chile',
    'colombia',
    'ecuador',
    'guyana',
    'paraguay',
    'peru',
    'suriname',
    'uruguay',
    'venezuela',
  ],
  Oceania: ['australia', 'fiji', 'kiribati', 'marshall islands', 'nauru', 'new zealand'],
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

function computeBreakdown(values) {
  const total = Number(values.cost_of_living) || 0;
  if (!total) {
    return {
      rent: 0.45,
      food: 0.25,
      transport: 0.15,
      leisure: 0.15,
    };
  }

  const rent = Math.max(Number(values.rent) || 0, 0);
  const food = Math.max(Number(values.groceries) || 0, 0);
  const transport = Math.max(Number(values.transportation) || 0, 0);
  const leisure = Math.max(total - (rent + food + transport), 0);
  const sum = rent + food + transport + leisure;

  if (!sum) {
    return {
      rent: 0.45,
      food: 0.25,
      transport: 0.15,
      leisure: 0.15,
    };
  }

  return {
    rent: rent / sum,
    food: food / sum,
    transport: transport / sum,
    leisure: leisure / sum,
  };
}

function computeSafetyScore(breakdown) {
  const rentShare = breakdown?.rent ?? 0.45;
  const transportShare = breakdown?.transport ?? 0.15;
  const baseScore = 100 - rentShare * 90;
  return Math.round(Math.max(0, Math.min(100, baseScore - transportShare * 15)));
}

function computeFunScore(breakdown) {
  const leisureShare = breakdown?.leisure ?? 0.15;
  return Math.round(Math.max(0, Math.min(100, leisureShare * 120)));
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
  const [maxMonthlyCost, setMaxMonthlyCost] = useState(2500);
  const [sortOption, setSortOption] = useState('runway');
  const [stayDuration, setStayDuration] = useState(6);

  const formatLocationName = useCallback((value) => {
    return String(value)
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const debouncedBudget = useDebounce(budget, 300);

  const budgetFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

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
      const clamped = Math.min(4000, Math.max(300, saved));
      setMaxMonthlyCost(clamped);
    }
  }, [profile, profileLoading]);

  const fetchRunwayData = useCallback(async () => {
    setIsCalculating(true);

    try {
      const results = Object.entries(Dictionary).map(([country, values]) => {
        const monthlyCost = values.cost_of_living;
        const runway = monthlyCost > 0 ? debouncedBudget / monthlyCost : 0;
        const breakdown = computeBreakdown(values);
        const continent = getContinent(country);
        const safetyScore = computeSafetyScore(breakdown);
        const funScore = computeFunScore(breakdown);

        return {
          city: formatLocationName(country),
          country,
          runway: Number.isFinite(runway) ? runway : 0,
          monthlyCost,
          currency: 'USD',
          breakdown,
          rentUSD: Number(values.rent) || null,
          continent,
          safetyScore,
          funScore,
        };
      });

      setRunwayData(results);
    } catch (error) {
      console.error('Error computing runways:', error);
      setRunwayData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [debouncedBudget, formatLocationName]);

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
      data = data.filter((entry) =>
        entry.city.toLowerCase().includes(lowerTerm) || entry.country.toLowerCase().includes(lowerTerm)
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
      { city: 'No data', runway: 0, monthlyCost: 0, currency: 'USD' }
    );
  }, [filteredAndSortedData]);

  const handleRefresh = useCallback(() => {
    fetchRunwayData();
  }, [fetchRunwayData]);

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
                <option value="cost-asc">Monthly cost (low to high)</option>
                <option value="cost-desc">Monthly cost (high to low)</option>
              </select>
            </div>

            <div className="rounded-3xl border border-dashed border-teal/40 bg-turquoise/10 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-teal">Monthly cost range</p>
                  <p className="text-xs text-charcoal/60">
                    Cap results to destinations under {budgetFormatter.format(maxMonthlyCost)} per month.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={300}
                    max={4000}
                    step={50}
                    value={maxMonthlyCost}
                    onChange={(event) => setMaxMonthlyCost(Number(event.target.value))}
                    className="h-2 w-48 flex-1 cursor-pointer appearance-none rounded-full bg-teal/20 accent-teal"
                  />
                  <span className="text-sm font-semibold text-teal">{budgetFormatter.format(maxMonthlyCost)}</span>
                </div>
              </div>
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
            <strong>{Number.isFinite(highlightCity.runway) ? highlightCity.runway.toFixed(1) : 'N/A'} months</strong>{' '}
            there.
          </p>
          <p className="mt-1 font-semibold text-teal/80">
            Plan a {stayDuration}-month stay for {formatPrice(highlightCity.monthlyCost * stayDuration)}.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedData.map((entry) => (
          <RunwayCard
            key={entry.city}
            {...entry}
            stayDurationMonths={stayDuration}
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
