import { useMemo } from 'react';
import CategoryTile from '../components/insights/CategoryTile.jsx';
import ComparisonChart from '../components/insights/ComparisonChart.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useTransactions } from '../hooks/useTransactions.js';
import { usePPP } from '../hooks/usePPP.js';

export function Insights() {
  const { totals } = useTransactions();
  const { rankedBySavings, adjustPrice } = usePPP();

  const chartData = useMemo(() => {
    return rankedBySavings.slice(0, 5).map((city) => ({
      city: city.city,
      value: Number(((1 - city.ppp) * 100).toFixed(1))
    }));
  }, [rankedBySavings]);

  const categories = useMemo(() => {
    const atlantaSpends = {
      Groceries: totals['Groceries'] ?? 350,
      Rent: totals['Rent'] ?? 1400,
      Transport: totals['Transport'] ?? 120
    };
    return Object.entries(atlantaSpends).map(([category, amount]) => {
      const lisbonAmount = adjustPrice(amount, 'Portugal', 'Germany');
      const delta = ((amount - lisbonAmount) / amount) * 100;
      return {
        title: category,
        description: `Atlanta ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} vs. Lisbon ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lisbonAmount)}`,
        delta
      };
    });
  }, [adjustPrice, totals]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader>
          <CardTitle>Smart-Spend insights</CardTitle>
          <p className="text-sm text-charcoal/70">
            Compare your spending categories with global PPP adjustments to see how far your dollars stretch.
          </p>
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
          <p className="text-sm text-charcoal/70">Your $100 in Atlanta ≈ amount shown in each city after PPP adjustments.</p>
        </CardHeader>
        <CardContent>
          <ComparisonChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Insights;
