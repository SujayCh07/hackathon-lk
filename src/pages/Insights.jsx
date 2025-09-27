import { useEffect, useMemo, useState } from 'react';
import CategoryTile from '../components/insights/CategoryTile.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';
import { useAuth } from '../hooks/useAuth.js';
import { useUserProfile } from '../hooks/useUserProfile.js';
import usePersonalization from '../hooks/usePersonalization.js';

export function Insights() {
  const { totals } = useTransactions();
  const { rankedBySavings, adjustPrice } = usePPP();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { profile } = useUserProfile(userId);
  const { data: personalization } = usePersonalization(userId);
  const [categories, setCategories] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);

  const baselineCountry = useMemo(() => {
    if (profile?.homeCountry?.name) return profile.homeCountry.name;
    return 'United States';
  }, [profile?.homeCountry?.name]);

  const atlantaSpends = useMemo(
    () => ({
      Groceries: totals['Groceries'] ?? 350,
      Rent: totals['Rent'] ?? 1400,
      Transport: totals['Transport'] ?? 120,
    }),
    [totals]
  );

  useEffect(() => {
    const targets = personalization?.curiousCities?.length
      ? personalization.curiousCities
      : rankedBySavings.slice(0, 3).map((entry) => entry.country ?? entry.city);

    if (!targets || targets.length === 0) return;

    const normalisedTargets = Array.from(new Set(targets))
      .map((name) => {
        const match = rankedBySavings.find((entry) => {
          const lower = name.toLowerCase();
          const normalized = entry.normalizedName?.toLowerCase?.();
          return (
            entry.city?.toLowerCase() === lower ||
            entry.country?.toLowerCase() === lower ||
            normalized === lower
          );
        });
        return match?.country ?? match?.city ?? name;
      })
      .filter(Boolean)
      .slice(0, 3);

    async function loadInsights() {
      const numberFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

      const firstCity = normalisedTargets[0];
      if (!firstCity) return;

      const adjustedCategories = await Promise.all(
        Object.entries(atlantaSpends).map(async ([category, amount]) => {
          const adjustedAmount = await adjustPrice(amount, baselineCountry, firstCity);
          const delta = typeof adjustedAmount === 'number' && amount > 0 ? ((amount - adjustedAmount) / amount) * 100 : 0;
          let recommendation = '';
          if (delta > 0) {
            recommendation = category === 'Groceries'
              ? 'Stock up on local markets — your food budget goes further here.'
              : category === 'Rent'
                ? 'Consider upgrading your stay or banking the rent savings.'
                : 'Redirect the savings into weekend adventures.';
          } else if (delta < 0) {
            recommendation = category === 'Groceries'
              ? 'Cook at home a few nights to offset pricier groceries.'
              : category === 'Rent'
                ? 'Choose a co-living or suburban neighbourhood to balance the rent jump.'
                : 'Lean on biking or public transit passes to stay on budget.';
          }

          return {
            title: category,
            description: `${baselineCountry} ${numberFormatter.format(amount)} vs. ${firstCity} ${numberFormatter.format(
              adjustedAmount ?? amount
            )}`,
            delta: parseFloat(delta.toFixed(1)),
            recommendation,
          };
        })
      );

      setCategories(adjustedCategories);

      const chartRows = await Promise.all(
        normalisedTargets.map(async (cityName) => {
          const rent = await adjustPrice(atlantaSpends.Rent, baselineCountry, cityName);
          const groceries = await adjustPrice(atlantaSpends.Groceries, baselineCountry, cityName);
          const transport = await adjustPrice(atlantaSpends.Transport, baselineCountry, cityName);
          const total = [rent, groceries, transport].reduce(
            (sum, value) => sum + (Number.isFinite(value) ? value : 0),
            0
          );
          return {
            city: cityName,
            Rent: total > 0 ? (rent ?? 0) / total : 0,
            Groceries: total > 0 ? (groceries ?? 0) / total : 0,
            Transport: total > 0 ? (transport ?? 0) / total : 0,
          };
        })
      );

      setChartData(chartRows);

      const [headlineCategory, comparisonCategory] = adjustedCategories;
      if (headlineCategory && comparisonCategory) {
        const headline = headlineCategory.delta < 0
          ? `You’d spend ${Math.abs(headlineCategory.delta).toFixed(0)}% more on ${headlineCategory.title.toLowerCase()} in ${firstCity}.`
          : `You’d save ${headlineCategory.delta.toFixed(0)}% on ${headlineCategory.title.toLowerCase()} in ${firstCity}.`;
        const contrast = comparisonCategory.delta < 0
          ? `Meanwhile, ${comparisonCategory.title.toLowerCase()} runs ${Math.abs(comparisonCategory.delta).toFixed(0)}% hotter.`
          : `${comparisonCategory.title} drops ${comparisonCategory.delta.toFixed(0)}%.`;
        setSummary(`${headline} ${contrast}`);
      } else {
        setSummary(null);
      }
    }

    loadInsights();
  }, [adjustPrice, atlantaSpends, baselineCountry, personalization?.curiousCities, rankedBySavings]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Smart-Spend insights</CardTitle>
          <p className="text-sm text-charcoal/70">
            Compare your spending with PPP adjustments. You can search up to <strong>5 cities</strong>.
          </p>
          {summary && <p className="mt-2 text-sm font-semibold text-teal">{summary}</p>}
          <p className="mt-1 text-xs text-charcoal/60">Smart-Spend = see exactly where your money goes globally.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {categories.map((category) => (
              <CategoryTile key={category.title} {...category} />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>PPP comparison</CardTitle>
          <p className="text-sm text-charcoal/70">Your $100 baseline redistributes across rent, groceries, and transport in each city.</p>
        </CardHeader>
        <CardContent>
          <ComparisonChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Insights;
