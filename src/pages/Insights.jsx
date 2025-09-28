import { useEffect, useMemo, useState } from 'react';
import CategoryTile from '../components/insights/CategoryTile.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Dictionary from './Dictionary.js';

// City → Country resolver using OpenStreetMap Nominatim API
async function cityToCountry(city) {
  const resp = await fetch(
    `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&format=json&addressdetails=1`
  );
  const data = await resp.json();
  if (data.length > 0 && data[0].address.country) {
    return data[0].address.country.toLowerCase(); // normalize to lowercase
  }
  return null;
}

// Apply a bit of randomization (±10%)
function applyRandomization(value, maxDeviation = 0.1) {
  const factor = 1 + (Math.random() * 2 - 1) * maxDeviation; // between 0.9 and 1.1
  return parseFloat((value * factor).toFixed(1));
}

function CityComparisonRow({ id, totals }) {
  const [input, setInput] = useState('');
  const [country, setCountry] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('idle');
  const [monthlyCost, setMonthlyCost] = useState(null);
  const [runway, setRunway] = useState(null);
  const [savingsPercent, setSavingsPercent] = useState(null);

  // Atlanta baseline spends
  const atlantaSpends = useMemo(
    () => ({
      Groceries: totals['Groceries'] ?? 350,
      Rent: totals['Rent'] ?? 1400,
      Transport: totals['Transport'] ?? 120,
    }),
    [totals]
  );

  // Debounce input (city or country)
  useEffect(() => {
    if (!input) {
      setCountry(null);
      setCategories([]);
      setStatus('idle');
      return;
    }

    setStatus('searching');

    const timer = setTimeout(() => {
      const normalizedInput = input.toLowerCase();

      // 1. If user typed a country directly
      if (Dictionary[normalizedInput]) {
        setCountry(normalizedInput);
        setStatus('loading');
        return;
      }

      // 2. Otherwise resolve as city → country
      cityToCountry(input)
        .then((resolvedCountry) => {
          if (resolvedCountry && Dictionary[resolvedCountry]) {
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
    }, 1500);

    return () => clearTimeout(timer);
  }, [input]);

  // Lookup costs in Dictionary once country is found
  useEffect(() => {
    if (!country) return;

    const countryData = Dictionary[country];
    if (!countryData) {
      setStatus('error');
      return;
    }

    try {
      const adjusted = Object.entries(atlantaSpends).map(([category, amount]) => {
        let foreignAmount = 0;
        if (category === 'Groceries') foreignAmount = countryData.groceries;
        if (category === 'Rent') foreignAmount = countryData.rent;
        if (category === 'Transport') foreignAmount = countryData.transportation;

        const delta = ((amount - foreignAmount) / amount) * 100;
        const randomizedDelta = applyRandomization(delta, 0.1);

        return {
          title: category,
          description: `Atlanta ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount)} vs. ${input} ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(foreignAmount)}`,
          delta: randomizedDelta,
        };
      });

      setCategories(adjusted);

      // Monthly cost = cost_of_living from dictionary
      const equivalent = countryData.cost_of_living;
      setMonthlyCost(equivalent);

      // Example: budget = $10k
      const budget = 10000;
      const r = Math.max(1, Math.floor(budget / equivalent));
      setRunway(r);

      // Savings %
      const baseCostUSD = 2000;
      const savings = ((baseCostUSD - equivalent) / baseCostUSD) * 100;
      setSavingsPercent(applyRandomization(savings, 0.15));

      setStatus('done');
    } catch (err) {
      console.error('Dictionary lookup failed:', err);
      setCategories([]);
      setStatus('error');
    }
  }, [country, input, atlantaSpends]);

  return (
    <div className="mb-8 p-4 border rounded-lg bg-white/70 shadow-sm">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Enter city or country (e.g. Berlin, Germany)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="rounded border px-3 py-2 w-64"
        />
      </div>

      {status === 'searching' && (
        <p className="text-sm text-charcoal/70">Searching...</p>
      )}
      {status === 'loading' && (
        <p className="text-sm text-charcoal/70">Loading data...</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">Not a valid city or missing in Dictionary</p>
      )}
      {/* Results section removed here for brevity */}
    </div>
  );
}

export function Insights() {
  const [rows, setRows] = useState([0]);
  const totals = {}; // no hooks, static values

  const addRow = () => {
    if (rows.length < 5) {
      setRows([...rows, rows.length]);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Smart-Spend insights</CardTitle>
          <p className="text-sm text-charcoal/70">
            Compare your spending with global cost-of-living data. You can search up to <strong>5 cities or countries</strong>.
          </p>
          <p className="mt-1 text-xs text-charcoal/60">
            Smart-Spend = see exactly where your money goes globally.
          </p>
        </CardHeader>
        <CardContent>
          {rows.map((id) => (
            <CityComparisonRow key={id} id={id} totals={totals} />
          ))}
          {rows.length < 5 && (
            <button
              onClick={addRow}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              ➕ Add Another City
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Insights;
