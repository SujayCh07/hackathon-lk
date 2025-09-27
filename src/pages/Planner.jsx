import { useMemo, useState } from 'react';
import BudgetSlider from '../components/planner/BudgetSlider.jsx';
import RunwayCard from '../components/planner/RunwayCard.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { useAccount } from '../hooks/useAccount.js';
import { usePPP } from '../hooks/usePPP.js';

export function Planner() {
  const { balanceUSD } = useAccount();
  const { cities, calculateRunway } = usePPP();
  const [budget, setBudget] = useState(2500);

  const runwayData = useMemo(() => {
    return cities.map((city) => {
      const runwayMonths = calculateRunway(budget, city.city);
      return {
        city: city.city,
        runway: runwayMonths,
        monthlyCost: city.monthlyCost,
        currency: city.currency
      };
    });
  }, [budget, calculateRunway, cities]);

  const highlightCity = useMemo(() => {
    return runwayData.reduce(
      (best, current) => (current.runway > best.runway ? current : best),
      { city: 'Lisbon', runway: 0, monthlyCost: 0, currency: 'USD' }
    );
  }, [runwayData]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Card className="bg-white/85">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>GeoBudget planner</CardTitle>
            <p className="text-sm text-charcoal/70">Adjust your spend target to see how long your balance lasts worldwide.</p>
          </div>
          <div className="rounded-2xl bg-turquoise/10 px-4 py-2 text-sm font-semibold text-teal">
            Balance ready: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balanceUSD)}
          </div>
        </CardHeader>
        <CardContent>
          <BudgetSlider value={budget} onChange={setBudget} />
        </CardContent>
      </Card>
      {runwayData.length > 0 && (
        <div className="rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5 text-sm text-teal">
          With a {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(budget)} budget, {highlightCity.city}
          offers the longest runway at {highlightCity.runway.toFixed(1)} months.
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {runwayData.map((entry) => (
          <RunwayCard key={entry.city} {...entry} />
        ))}
      </div>
    </div>
  );
}

export default Planner;
