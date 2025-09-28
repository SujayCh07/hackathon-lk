import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import CategoryTile from '../components/insights/CategoryTile.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import Dictionary from './Dictionary.js';

// Title-case helper (keeps acronyms like USA)
function toTitleCase(str) {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map(word =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

// Enhanced city → country resolver with proper error handling and timeouts
async function cityToCountry(city, signal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&addressdetails=1&limit=1`,
      {
        signal: signal || controller.signal,
        headers: {
          'User-Agent': 'CityComparison/1.0 (your-email@example.com)' // replace with real email
        }
      }
    );

    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }

    const data = await resp.json();
    if (data.length > 0 && data[0].address?.country) {
      return data[0].address.country.toLowerCase();
    }
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

// Apply randomization (±10%)
function applyRandomization(value, maxDeviation = 0.1) {
  const factor = 1 + (Math.random() * 2 - 1) * maxDeviation;
  return parseFloat((value * factor).toFixed(1));
}

// Debounce hook
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

function CityComparisonRow({ id, totals }) {
  const [input, setInput] = useState('');
  const [country, setCountry] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('idle');
  const [monthlyCost, setMonthlyCost] = useState(null);
  const [runway, setRunway] = useState(null);
  const [savingsPercent, setSavingsPercent] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const debouncedInput = useDebounce(input, 1000);
  const abortControllerRef = useRef(null);

  const atlantaSpends = useMemo(
    () => ({
      Groceries: totals['Groceries'] ?? 350,
      Rent: totals['Rent'] ?? 1400,
      Transport: totals['Transport'] ?? 120,
    }),
    [totals]
  );

  // Location resolution
  const resolveLocation = useCallback(async (inputValue) => {
    if (!inputValue.trim()) {
      setCountry(null);
      setCategories([]);
      setStatus('idle');
      setErrorMessage('');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setStatus('searching');
    setErrorMessage('');

    try {
      const normalizedInput = inputValue.toLowerCase().trim();

      if (Dictionary[normalizedInput]) {
        setCountry(normalizedInput);
        setStatus('loading');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      const resolvedCountry = await cityToCountry(inputValue, signal);

      if (signal.aborted) return;

      if (resolvedCountry && Dictionary[resolvedCountry]) {
        setCountry(resolvedCountry);
        setStatus('loading');
      } else if (resolvedCountry) {
        setCountry(null);
        setCategories([]);
        setStatus('error');
        setErrorMessage(`Found ${toTitleCase(resolvedCountry)} but no cost data available`);
      } else {
        setCountry(null);
        setCategories([]);
        setStatus('error');
        setErrorMessage('Location not found. Try a major city or country name.');
      }
    } catch (error) {
      if (signal.aborted) return;
      console.error('Location resolution error:', error);
      setCountry(null);
      setCategories([]);
      setStatus('error');

      if (error.message === 'Request timed out') {
        setErrorMessage('Request timed out. Please try again.');
      } else if (error.message.includes('HTTP error')) {
        setErrorMessage('Service temporarily unavailable. Please try again later.');
      } else {
        setErrorMessage('Unable to find location. Try a different search term.');
      }
    }
  }, []);

  useEffect(() => {
    resolveLocation(debouncedInput);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedInput, resolveLocation]);

  // Cost calculations
  useEffect(() => {
    if (!country || status !== 'loading') return;

    const countryData = Dictionary[country];
    if (!countryData) {
      setStatus('error');
      setErrorMessage('Country data not available');
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

        const formattedCity = toTitleCase(input);
        const formattedCountry = toTitleCase(country);

        return {
          title: category,
          description: `Atlanta: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(amount)}\n${formattedCity}, ${formattedCountry}: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(foreignAmount)}`,
          delta: randomizedDelta,
        };
      });

      setCategories(adjusted);

      const equivalent = countryData.cost_of_living;
      setMonthlyCost(equivalent);

      const budget = 10000;
      const r = Math.max(1, Math.floor(budget / equivalent));
      setRunway(r);

      const baseCostUSD = 2000;
      const savings = ((baseCostUSD - equivalent) / baseCostUSD) * 100;
      setSavingsPercent(applyRandomization(savings, 0.15));

      setStatus('done');
      setErrorMessage('');
    } catch (err) {
      console.error('Dictionary lookup failed:', err);
      setCategories([]);
      setStatus('error');
      setErrorMessage('Failed to calculate costs');
    }
  }, [country, input, atlantaSpends, status]);

  return (
    <div className="mb-8 p-4 border rounded-lg bg-white/70 shadow-sm">
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Enter city or country (e.g. Berlin, Germany)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="rounded border px-3 py-2 w-64 focus:ring-2 focus:ring-blue-500"
          disabled={status === 'searching'}
        />
        {status === 'searching' && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {status === 'searching' && (
        <p className="text-sm text-charcoal/70 animate-pulse">Searching for location...</p>
      )}

      {status === 'loading' && (
        <p className="text-sm text-charcoal/70 animate-pulse">Loading cost data...</p>
      )}

      {status === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errorMessage}</p>
          <p className="text-xs text-red-500 mt-1">Try searching for a major city or use the full country name.</p>
        </div>
      )}

      {status === 'done' && categories.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {categories.map((category, idx) => (
              <CategoryTile key={idx} {...category} />
            ))}
          </div>

          {monthlyCost && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md space-y-1 text-sm">
              <p><strong>Monthly Cost:</strong> ${monthlyCost?.toLocaleString()}</p>
              {runway && (
                <p><strong>Budget Runway:</strong> {runway} months</p>
              )}
              {savingsPercent !== null && (
                <p>
                  <strong>Savings vs Atlanta:</strong>{" "}
                  <span className={savingsPercent >= 0 ? "text-green-600" : "text-red-600"}>
                    {savingsPercent > 0 ? "▼ " : "▲ "}
                    {savingsPercent.toFixed(1)}%
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Insights() {
  const [rows, setRows] = useState([0]);
  const totals = {};

  const addRow = () => {
    if (rows.length < 5) {
      setRows([...rows, rows.length]);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Smart-Spend Insights</CardTitle>
          <p className="text-sm text-charcoal/70">
            Compare your spending with global cost-of-living data. You can search up to <strong>5 cities or countries</strong>.
          </p>
          <p className="mt-1 text-xs text-charcoal/60">Smart-Spend = see exactly where your money goes globally.</p>
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
