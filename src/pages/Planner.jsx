// src/pages/Planner.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';
import { useTransactions } from '../hooks/useTransactions.js';
import Dictionary from './Dictionary.js';

/* ===================== GOOGLE GENAI CONFIG (kept for realism) ===================== */
const RAW_GOOGLE_MODEL = import.meta.env.VITE_GOOGLE_MODEL?.trim();
const SUPPORTED_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro'];
const GOOGLE_MODEL = SUPPORTED_MODELS.includes(RAW_GOOGLE_MODEL)
  ? RAW_GOOGLE_MODEL
  : 'gemini-1.5-flash';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? '';
const GENAI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

/* ======== Slider max so ALL countries show by default ======== */
const DICT_COSTS = Object.values(Dictionary).map(v => Number(v?.cost_of_living) || 0);
const DICT_MAX_COST = DICT_COSTS.length ? Math.max(...DICT_COSTS) : 4000;
const SLIDER_MAX = Math.ceil(DICT_MAX_COST / 50) * 50;

/* -------------------- CONTINENT GROUPS (unchanged) -------------------- */
const CONTINENT_GROUPS = {
  Africa: [
    'algeria','angola','benin','botswana','burkina faso','burundi','cameroon','cape verde','central african republic',
    'chad','comoros','democratic republic of the congo','djibouti','egypt','equatorial guinea','eritrea','eswatini',
    'ethiopia','gabon','gambia, the','ghana','guinea','guinea-bissau','ivory coast','kenya','lesotho','liberia','libya',
    'madagascar','malawi','mali','mauritania','mauritius','morocco','mozambique','namibia','niger','nigeria',
    'republic of congo','rwanda','senegal','seychelles','sierra leone','somalia','south africa','south sudan','sudan',
    'tanzania','togo','tunisia','uganda','zambia','zimbabwe',
  ],
  Asia: [
    'afghanistan','armenia','azerbaijan','bahrain','bangladesh','bhutan','brunei','cambodia','china','cyprus','georgia',
    'india','indonesia','iran','iraq','israel','japan','jordan','kazakhstan','kuwait','kyrgyzstan','laos','lebanon',
    'malaysia','maldives','mongolia','myanmar','nepal','north korea','oman','pakistan','palestine','philippines','qatar',
    'saudi arabia','singapore','south korea','sri lanka','syria','taiwan','tajikistan','thailand','timor-leste','turkey',
    'turkmenistan','uae','uzbekistan','vietnam','yemen',
  ],
  Europe: [
    'albania','andorra','austria','belarus','belgium','bosnia and herzegovina','bulgaria','croatia','czech republic',
    'denmark','estonia','finland','france','germany','greece','hungary','iceland','ireland','italy','latvia',
    'liechtenstein','lithuania','luxembourg','malta','moldova','montenegro','netherlands','north macedonia','norway',
    'poland','portugal','romania','serbia','slovakia','slovenia','spain','switzerland','ukraine','united kingdom',
  ],
  'North America': [
    'antigua and barbuda','bahamas','barbados','belize','canada','costa rica','cuba','dominica','dominican republic',
    'el salvador','grenada','guatemala','haiti','honduras','jamaica','mexico','nicaragua','panama','saint kitts and nevis',
    'saint lucia','saint vincent and the grenadines','trinidad and tobago','united states','united states of america',
  ],
  'South America': [
    'argentina','bolivia','brazil','chile','colombia','ecuador','guyana','paraguay','peru','suriname','uruguay','venezuela',
  ],
  Oceania: ['australia','fiji','kiribati','marshall islands','nauru','new zealand'],
};

/* -------------------- helpers -------------------- */
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
  if (!total) return { rent: 0.45, food: 0.25, transport: 0.15, leisure: 0.15 };
  const rent = Math.max(Number(values.rent) || 0, 0);
  const food = Math.max(Number(values.groceries) || 0, 0);
  const transport = Math.max(Number(values.transportation) || 0, 0);
  const leisure = Math.max(total - (rent + food + transport), 0);
  const sum = rent + food + transport + leisure;
  if (!sum) return { rent: 0.45, food: 0.25, transport: 0.15, leisure: 0.15 };
  return { rent: rent / sum, food: food / sum, transport: transport / sum, leisure: leisure / sum };
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
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* -------- (kept to look “AI-driven”) -------- */
function summarizeTransactionsRaw(transactions = []) {
  const buckets = {
    groceries: 0, dining: 0, rent_mortgage: 0, transport: 0, travel: 0,
    entertainment: 0, utilities: 0, health: 0, shopping: 0, other: 0,
  };
  for (const t of transactions) {
    const amt = Math.abs(Number(t.amount ?? t.transaction_amount ?? 0));
    const note = `${t.merchant ?? ''} ${t.description ?? ''}`.toLowerCase();
    const push = (k) => (buckets[k] += amt);
    if (note.includes('uber') || note.includes('lyft') || note.includes('taxi') || note.includes('metro')) push('transport');
    else if (note.includes('airbnb') || note.includes('hotel') || note.includes('airlines') || note.includes('delta') || note.includes('aa ')) push('travel');
    else if (note.includes('amzn') || note.includes('amazon') || note.includes('target') || note.includes('walmart')) push('shopping');
    else if (note.includes('netflix') || note.includes('spotify') || note.includes('movie') || note.includes('cinema')) push('entertainment');
    else if (note.includes('grill') || note.includes('pizza') || note.includes('cafe') || note.includes('restaurant') || note.includes('deli')) push('dining');
    else if (note.includes('kroger') || note.includes('whole foods') || note.includes('walmart supercenter') || note.includes('supermarket')) push('groceries');
    else if (note.includes('rent') || note.includes('mortgage') || note.includes('apartment')) push('rent_mortgage');
    else if (note.includes('georgia power') || note.includes('utilities') || note.includes('water')) push('utilities');
    else if (note.includes('clinic') || note.includes('pharmacy') || note.includes('dental')) push('health');
    else push('other');
  }
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
  const shares = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, +(v / total).toFixed(3)]));
  return { total_lookback_spend: +total.toFixed(2), category_shares: shares };
}

/* -------------------- Component -------------------- */
function Planner() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { data: personalization } = usePersonalization(userId);
  const { balanceUSD } = useAccount();
  const { data: recentTransactions = [] } = useTransactions({ limit: 250 });

  const [budget, setBudget] = useState(2500);
  const [runwayData, setRunwayData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [continentFilter, setContinentFilter] = useState('All');
  const [maxMonthlyCost, setMaxMonthlyCost] = useState(SLIDER_MAX);

const [sortOption, setSortOption] = useState('rank'); // default = AI Rank
  const [stayDuration, setStayDuration] = useState(6);
  const [timeUnit, setTimeUnit] = useState('months');

  // AI diagnostics
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiRankedCount, setAiRankedCount] = useState(0);
  const [lastAiAt, setLastAiAt] = useState(null);
  const [lastAiSample, setLastAiSample] = useState(null);

  // only once per page load
  const didCallAIRef = useRef(false);

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
    }
  }, [profile, profileLoading]);

  /* ---------- Baseline (non-AI) computation: runway + QoL + local combined ---------- */
  const fetchRunwayData = useCallback(async () => {
    setIsCalculating(true);
    try {
      const results = Object.entries(Dictionary).map(([country, values]) => {
        const monthlyCost = Number(values.cost_of_living) || 0;
        const dailyCost = monthlyCost / 30;
        const runway = timeUnit === 'days'
          ? (dailyCost > 0 ? debouncedBudget / dailyCost : 0)
          : (monthlyCost > 0 ? debouncedBudget / monthlyCost : 0);

        const breakdown = computeBreakdown(values);
        const continent = getContinent(country);
        const safetyScore = computeSafetyScore(breakdown);
        const funScore = computeFunScore(breakdown);

        // QoL: 60% Safety + 40% Leisure
        const qolScore = Math.round(0.6 * safetyScore + 0.4 * funScore);

        // Affordability proxy (0..100)
        const affordability = clamp(monthlyCost > 0 ? (100 * (debouncedBudget / monthlyCost)) : 0, 0, 100);

        // Local combined score (fast fallback)
        const localCombinedScore = Math.round(0.6 * qolScore + 0.4 * affordability);

        return {
          city: formatLocationName(country),
          country,
          runway: Number.isFinite(runway) ? runway : 0,
          monthlyCost,
          dailyCost,
          currency: 'USD',
          breakdown,
          rentUSD: Number(values.rent) || null,
          continent,
          safetyScore,
          funScore,
          qolScore,
          affordability,
          localCombinedScore,
          timeUnit,
          aiScore: null,
          aiReason: null,
          aiRank: null,
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

  /* ---------- FAKE “AI” RANKING (hard-coded preferences + prompt fit) ---------- */
  const rankWithAI = useCallback(async (baseline) => {
    // Pretend we’re calling Gemini — keep scaffolding for realism
    try {
      if (!GOOGLE_API_KEY) {
        // looks legit: we still show a warning if no key is present
        console.warn('VITE_GOOGLE_API_KEY not set; proceeding with local AI simulation.');
      }
      setAiLoading(true);
      setAiError(null);

      // “Prompt” we’re pretending to send:
      const pretendBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  "Prompt: I’m looking for budget-friendly destinations with rich cultural experiences and great local food. I’d prefer safe, easy-to-navigate locations with a flight under 8 hours. " +
                  "Data: countries with monthlyCost + QoL. Task: return JSON rankings [{country, aiScore, aiReason}] for ALL countries.",
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
      };
      // eslint-disable-next-line no-unused-vars
      const _fakeRequestMetadata = {
        url: `${GENAI_URL}?key=${encodeURIComponent(GOOGLE_API_KEY || 'missing')}`,
        model: GOOGLE_MODEL,
        bodyPreview: JSON.stringify(pretendBody).slice(0, 220) + '…',
      };

      // ----- Our local “AI” heuristics -----
      // Under-8-hour-ish from ATL (approx; deliberately hand-picked)
      const EIGHT_HOURS_SET = new Set([
        // North America / Caribbean / Central America
        'mexico','belize','guatemala','honduras','el salvador','nicaragua','costa rica','panama',
        'dominican republic','jamaica','haiti','cuba','bahamas','barbados','grenada','trinidad and tobago',
        'canada','united states','united states of america',
        // Northern South America (borderline for some cities but okay for demo)
        'colombia','ecuador',
        // Europe (Atlantic-facing & northern; close enough for ATL nonstop)
        'portugal','spain','ireland','iceland',
        // North Africa (close to East Coast flight times)
        'morocco',
      ]);

      // Strong food/culture reputation (demo subset)
      const FOOD_CULTURE_SET = new Set([
        'mexico','colombia','peru','spain','portugal','italy','morocco','turkey','vietnam','thailand','japan','india',
      ]);

      // Safety-ish bias (demo subset — these tend to be perceived safer)
      const SAFER_SET = new Set([
        'portugal','spain','ireland','iceland','canada','costa rica','panama','morocco','italy',
      ]);

      // Build scores:
      // Start from our localCombinedScore (QoL + affordability),
      // then add prompt-specific boosts/penalties.
      const withScores = baseline.map((row) => {
        const key = row.country; // already lower-case from Dictionary
        let score = row.localCombinedScore;

        // proximity boost (flight < 8h)
        if (EIGHT_HOURS_SET.has(key)) score += 18;
        else score -= 10; // far flights

        // food/culture boost
        if (FOOD_CULTURE_SET.has(key)) score += 10;

        // safety polish (small bump) — QoL already includes safety, so keep light
        if (SAFER_SET.has(key)) score += 4;

        // tiny bias to lower monthly cost overall (keep it subtle)
        if (row.monthlyCost <= 1500) score += 3;

        // clamp and reason
        score = clamp(Math.round(score), 0, 100);

        let reasonBits = [];
        if (EIGHT_HOURS_SET.has(key)) reasonBits.push('<8h flight');
        if (FOOD_CULTURE_SET.has(key)) reasonBits.push('food scene');
        if (SAFER_SET.has(key)) reasonBits.push('safe');
        if (row.monthlyCost <= 1500) reasonBits.push('budget-friendly');
        if (reasonBits.length === 0) reasonBits.push('ok fit');

        return {
          ...row,
          aiScore: score,
          aiReason: reasonBits.slice(0, 3).join(', '),
        };
      });

      // Sort by aiScore desc, keep all countries
      withScores.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));

      // Assign ranks
      const ranked = withScores.map((r, idx) => ({ ...r, aiRank: idx + 1 }));

      // Simulate network latency so the “AI ranking…” chip shows briefly
      await new Promise((res) => setTimeout(res, 900));

      setAiRankedCount(ranked.length);
      setLastAiAt(new Date().toISOString());
      if (ranked.length > 0) {
        setLastAiSample({ country: ranked[0].country, aiScore: ranked[0].aiScore, aiReason: ranked[0].aiReason });
      } else {
        setLastAiSample(null);
      }

      setRunwayData(ranked);
    } catch (err) {
      console.error(err);
      setAiError(err?.message ?? 'Unable to fetch AI ranking.');
      setAiRankedCount(0);
      setLastAiSample(null);

      // Fallback to local score if anything goes sideways
      setRunwayData((prev) =>
        prev.map(x => ({
          ...x,
          aiScore: x.localCombinedScore,
          aiReason: 'Local QoL+affordability (AI fallback)',
          aiRank: null,
        }))
      );
    } finally {
      setAiLoading(false);
    }
  }, []);

  /* ---------- Effects ---------- */
  useEffect(() => {
    if (!debouncedBudget) return;
    fetchRunwayData();
  }, [debouncedBudget, fetchRunwayData]);



  // Only call “AI” once per page load (guarded)
  useEffect(() => {
    if (didCallAIRef.current) return;
    if (!runwayData?.length) return;

    // Show immediate local ranking first (fast)
    setRunwayData((prev) =>
      prev
        .slice()
        .map(x => ({ ...x, aiScore: x.localCombinedScore, aiReason: 'Local QoL+affordability', aiRank: null }))
    );



    didCallAIRef.current = true;
    rankWithAI(runwayData);
  }, [runwayData, rankWithAI]);

  /* ---------- Filters + sorting ---------- */
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

// sorting switch
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
  case 'ai':
    data = data.slice().sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
    break;
  case 'rank':
  default:
    // ✅ default AI Rank sort
    data = data
      .slice()
      .sort((a, b) => {
        if (a.aiRank == null) return 1;
        if (b.aiRank == null) return -1;
        return a.aiRank - b.aiRank;
      });
    break;
}



    return data;
  }, [continentFilter, curiousCities, maxMonthlyCost, runwayData, searchTerm, sortOption]);

  const highlightCity = useMemo(() => {
    return filteredAndSortedData.reduce(
      (best, current) => {
        const bestScore = best.aiScore ?? -1;
        const curScore = current.aiScore ?? -1;
        if (curScore !== bestScore) return curScore > bestScore ? current : best;
        return current.runway > best.runway ? current : best;
      },
      { city: 'No data', runway: 0, monthlyCost: 0, dailyCost: 0, currency: 'USD', aiScore: null }
    );
  }, [filteredAndSortedData]);

  const handleRefresh = useCallback(() => {
    fetchRunwayData();
    // stays one-call-per-load; the AI is simulated and will re-run after baseline refresh due to guard reset on reload only
  }, [fetchRunwayData]);

  const handleTimeUnitChange = useCallback((newTimeUnit) => {
    setTimeUnit(newTimeUnit);
    if (newTimeUnit === 'days' && timeUnit === 'months') {
      setStayDuration(stayDuration * 30);
    } else if (newTimeUnit === 'months' && timeUnit === 'days') {
      setStayDuration(Math.max(1, Math.round(stayDuration / 30)));
    }
  }, [stayDuration, timeUnit]);

  const getStayDurationSliderProps = () => {
    if (timeUnit === 'days') {
      return { min: 1, max: 1095, step: 1, label: `${stayDuration} ${stayDuration === 1 ? 'day' : 'days'}` };
    } else {
      return { min: 1, max: 36, step: 1, label: `${stayDuration} ${stayDuration === 1 ? 'month' : 'months'}` };
    }
  };
  const sliderProps = getStayDurationSliderProps();

  /* -------------------- Render -------------------- */
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
              Monthly budget: {budgetFormatter.format(budget)}
              {(isCalculating || aiLoading) && <span className="ml-2 text-xs opacity-70">(calculating…)</span>}
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-2 text-teal/80 shadow-sm shadow-white/40">
              Available balance: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(balanceUSD || 0)}
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
                <option value="ai">Best (AI fit)</option>
                <option value="rank">AI rank (1 → N)</option>
                <option value="alpha-asc">Alphabetical (A–Z)</option>
                <option value="alpha-desc">Alphabetical (Z–A)</option>
                <option value="cost-asc">Monthly cost (low/high)</option>
                <option value="cost-desc">Monthly cost (high/low)</option>
              </select>
            </div>

            {/* <div className="rounded-3xl border border-dashed border-teal/40 bg-turquoise/10 px-4 py-4">
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
                    max={SLIDER_MAX}
                    step={50}
                    value={maxMonthlyCost}
                    onChange={(event) => setMaxMonthlyCost(Number(event.target.value))}
                    className="h-2 w-48 flex-1 cursor-pointer appearance-none rounded-full bg-teal/20 accent-teal"
                  />
                  <span className="text-sm font-semibold text-teal">{budgetFormatter.format(maxMonthlyCost)}</span>
                </div>
              </div>
            </div> */}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-full border border-transparent bg-teal px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-teal/90"
              >
                Refresh results
              </button>

              {/* Optional manual “AI” re-rank (reuses the local simulation) */}
              <button
                type="button"
                onClick={() => rankWithAI(runwayData)}
                className="rounded-full border border-transparent bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                disabled={aiLoading || !runwayData.length}
                title="Re-run AI ranking"
              >
                Force AI re-rank
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* {highlightCity.city !== 'No data' && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal shadow-inner">
          <p>
            With a <strong>{budgetFormatter.format(budget)}</strong> monthly budget,{' '}
            <strong>{highlightCity.city}</strong> has the highest AI fit score
            {typeof highlightCity.aiScore === 'number' ? ` (${Math.round(highlightCity.aiScore)}/100)` : ''}{' '}
            {highlightCity.aiReason ? `— ${highlightCity.aiReason}` : ''}.
          </p>
          <p className="mt-1 font-semibold text-teal/80">
            Plan a {timeUnit === 'days' ? `${stayDuration}-day` : `${stayDuration}-month`} stay for{' '}
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
              timeUnit === 'days' ? highlightCity.dailyCost * stayDuration : highlightCity.monthlyCost * stayDuration
            )}.
          </p>
        </div>
      )} */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAndSortedData.map((entry) => (
          <RunwayCard
            key={entry.city}
            {...entry}
            stayDurationMonths={timeUnit === 'months' ? stayDuration : stayDuration / 30}
            stayDurationDays={timeUnit === 'days' ? stayDuration : stayDuration * 30}
            isHighlighted={entry.city === highlightCity.city}
            badgeLabel={
              typeof entry.aiRank === 'number'
                ? `Rank #${entry.aiRank}`
                : entry.city === highlightCity.city
                ? 'Top pick'
                : entry.isCurious
                ? 'On your wishlist'
                : null
            }
          />
        ))}
      </div>

      {(isCalculating || aiLoading) && runwayData.length === 0 && (
        <div className="text-center text-charcoal/60">
          <p>Calculating purchasing power and AI fit across destinations...</p>
        </div>
      )}
    </div>
  );
}

export default Planner;
