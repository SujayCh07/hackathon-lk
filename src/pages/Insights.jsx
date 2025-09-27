import { useEffect, useMemo, useState } from 'react';
import CategoryTile from '../components/insights/CategoryTile.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';

// City → Country resolver using OpenStreetMap Nominatim API
async function cityToCountry(city) {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&addressdetails=1`
  );
  const data = await resp.json();
  if (data.length > 0 && data[0].address.country) {
    return data[0].address.country;
  }
  return null;
}

// Apply a bit of randomization (±10%)
function applyRandomization(value, maxDeviation = 0.1) {
  const factor = 1 + (Math.random() * 2 - 1) * maxDeviation; // between 0.9 and 1.1
  return parseFloat((value * factor).toFixed(1));
}

// A single row component
function CityComparisonRow({ id, totals, adjustPrice, getPPPRatio, calculateRunway }) {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | searching | loading | error | done
  const [monthlyCost, setMonthlyCost] = useState(null);
  const [runway, setRunway] = useState(null);
  const [savingsPercent, setSavingsPercent] = useState(null);

  // Static Atlanta spends
  const atlantaSpends = useMemo(() => ({
    Groceries: totals['Groceries'] ?? 350,
    Rent: totals['Rent'] ?? 1400,
    Transport: totals['Transport'] ?? 120,
  }), [totals]);

  // Debounce typing (2s)
  useEffect(() => {
    if (!city) {
      setCountry(null);
      setCategories([]);
      setStatus('idle');
      return;
    }

    setStatus('searching');

    const timer = setTimeout(() => {
      cityToCountry(city)
        .then((resolvedCountry) => {
          if (resolvedCountry) {
            setCountry(resolvedCountry);
            setStatus('loading');
          } else {
            setCountry(null);
            setCategories([]);
            setStatus('error');
          }
        })
        .catch(() => {
          setCountry(null);
          setCategories([]);
          setStatus('error');
        });
    }, 2000);

    return () => clearTimeout(timer);
  }, [city]);

  // Fetch PPP adjustments and monthly cost after country is resolved
  useEffect(() => {
    if (!country) return;

    const loadAdjustedCategories = async () => {
      try {
        const adjusted = await Promise.all(
          Object.entries(atlantaSpends).map(async ([category, amount]) => {
            const foreignAmount = await adjustPrice(amount, 'USA', country);
            const delta = typeof foreignAmount === 'number'
              ? ((amount - foreignAmount) / amount) * 100
              : 0;

            // Randomize deltas a little
            const randomizedDelta = applyRandomization(delta, 0.1);

            return {
              title: category,
              description: `Atlanta ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(amount)} vs. ${city} ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(foreignAmount)}`,
              delta: randomizedDelta,
            };
          })
        );
        setCategories(adjusted);

        // Also fetch PPP ratio and monthly cost
        const ratio = await getPPPRatio('USA', country);
        if (ratio) {
          const baseCostUSD = 2000;
          const equivalent = Math.round(baseCostUSD / ratio);
          setMonthlyCost(equivalent);

          // Example: assume user budget is $10k
          const budget = 10000;
          const r = await calculateRunway(budget, 'USA', country, equivalent);
          setRunway(r);

          // Compute savings %
          const savings = ((baseCostUSD - equivalent) / baseCostUSD) * 100;
          setSavingsPercent(applyRandomization(savings, 0.15)); // ±15% wiggle room
        }

        setStatus('done');
      } catch (err) {
        console.error('PPP adjustment failed:', err);
        setCategories([]);
        setStatus('error');
      }
    };

    loadAdjustedCategories();
  }, [adjustPrice, atlantaSpends, country, city, getPPPRatio, calculateRunway]);

  return (
    <div className="mb-8 p-4 border rounded-lg bg-white/70 shadow-sm">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Enter city (e.g. Berlin)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded border px-3 py-2 w-64"
        />
      </div>

      {status === 'searching' && (
        <p className="text-sm text-charcoal/70">Searching...</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-charcoal/70">Loading PPP adjustments...</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">Not a valid city</p>
      )}
      {status === 'done' && categories.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((category) => (
              <CategoryTile key={category.title} {...category} />
            ))}
          </div>
          {monthlyCost && (
            <p className="mt-4 text-sm text-charcoal/70">
              In {city}, a comfortable lifestyle costs about{' '}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(monthlyCost)}{' '}
              per month compared to $2,000 in Atlanta.
            </p>
          )}
          {runway && (
            <p className="text-sm text-charcoal/70">
              A $10,000 budget would last roughly {runway} months in {city}.
            </p>
          )}
          {savingsPercent !== null && (
            <p className="text-sm text-charcoal/70">
              Overall, living in {city} is about {savingsPercent}% cheaper than Atlanta.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function Insights() {
  const { totals } = useTransactions();
  const { adjustPrice, getPPPRatio, calculateRunway } = usePPP();
  const [rows, setRows] = useState([0]);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: personalization } = usePersonalization(userId);

  const addRow = () => {
    if (rows.length < 5) {
      setRows([...rows, rows.length]);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      {personalization && (
        <Card className="bg-white/85">
          <CardHeader>
            <CardTitle>Personalised focus</CardTitle>
            <p className="text-sm text-charcoal/70">
              We’re tuning insights for {personalization.travelStyle ?? 'your travel style'} with a {personalization.budgetFocus ?? 'Balanced'} budget focus.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-slate/60">
            {personalization.travelInterests?.map((interest) => (
              <span key={interest} className="rounded-full bg-teal/10 px-3 py-1 text-teal/80">
                {interest}
              </span>
            ))}
            {personalization.favoriteCategories?.map((category) => (
              <span key={category} className="rounded-full bg-coral/10 px-3 py-1 text-coral/80">
                {category}
              </span>
            ))}
            {personalization.preferredContinents?.map((continent) => (
              <span key={continent} className="rounded-full bg-navy/10 px-3 py-1 text-navy">
                {continent}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Smart-Spend insights</CardTitle>
          <p className="text-sm text-charcoal/70">
            Compare your spending with PPP adjustments. You can search up to <strong>5 cities</strong>.
          </p>
          <p className="mt-1 text-xs text-charcoal/60">Smart-Spend = see exactly where your money goes globally.</p>
        </CardHeader>
        <CardContent>
          {rows.map((id) => (
            <CityComparisonRow
              key={id}
              id={id}
              totals={totals}
              adjustPrice={adjustPrice}
              getPPPRatio={getPPPRatio}
              calculateRunway={calculateRunway}
            />
          ))}
          {rows.length < 5 && (
            <button
              onClick={addRow}
              className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              ➕ Add another city
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Insights;
