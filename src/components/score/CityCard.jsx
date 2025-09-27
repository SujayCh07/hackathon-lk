import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';

export function CityCard({ city, savings, monthlyCost, currency = 'USD' }) {
  const formattedSavings =
    savings > 0
      ? `Save ${savings.toFixed(0)}% vs. Atlanta`
      : `Spend ${Math.abs(savings).toFixed(0)}% more`;

  const formattedCost = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(monthlyCost);

  return (
    <Card className="bg-white/80">
      <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
      <p className="mt-2 text-sm text-charcoal/70">
        Monthly PPP cost ≈ {formattedCost}
      </p>
      <p className="mt-3 text-sm font-semibold text-turquoise">
        {formattedSavings}
      </p>
      <Progress
        value={Math.min(100, Math.max(10, 50 + savings))}
        className="mt-4"
      />
    </Card>
  );
}

export default CityCard;
