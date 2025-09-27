import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';

function normaliseSavings(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return 0;
}

export function CityCard({ city, savings, savingsPct, monthlyCost, currency = 'USD', ppp }) {
  const effectiveSavings = normaliseSavings(savings ?? savingsPct ?? 0);
  const formattedSavings =
    effectiveSavings > 0
      ? `Save ${effectiveSavings.toFixed(0)}% vs. your baseline`
      : `Spend ${Math.abs(effectiveSavings).toFixed(0)}% more`; // negative indicates more expensive

  const formattedCost = Number.isFinite(monthlyCost)
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(monthlyCost)
    : '—';

  const progressValue = Math.min(100, Math.max(8, 50 + effectiveSavings));

  return (
    <Card className="bg-white/80 transition hover:-translate-y-1 hover:shadow-xl">
      <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-charcoal/50">PPP {ppp ? ppp.toFixed(1) : '—'}</p>
      <p className="mt-2 text-sm text-charcoal/70">Monthly PPP cost ≈ {formattedCost}</p>
      <p className="mt-3 text-sm font-semibold text-turquoise">{formattedSavings}</p>
      <Progress value={progressValue} className="mt-4" />
    </Card>
  );
}

export default CityCard;
