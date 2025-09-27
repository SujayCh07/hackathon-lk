import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';

// Helper function to safely apply .toFixed
function safeToFixed(value, digits = 1) {
  const num = parseFloat(value);
  return isNaN(num) ? '0.0' : num.toFixed(digits);
}

// Format runway into months or years + months
function formatRunway(runway) {
  const num = parseFloat(runway);
  if (isNaN(num) || num < 0) return '0.0 months';

  if (num <= 12) {
    return `${num.toFixed(1)} months`;
  }

  const totalMonths = Math.round(num * 10) / 10; // preserve decimal for months
  const years = Math.floor(totalMonths / 12);
  const months = Math.round((totalMonths % 12) * 10) / 10;

  let result = '';
  if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
  if (months > 0) result += ` ${months.toFixed(1)} month${months !== 1 ? 's' : ''}`;

  return result.trim();
}

export function RunwayCard({ city, runway, monthlyCost, currency = 'USD' }) {
  const percent = Math.min(100, (runway / 12) * 100);

  const formattedCost = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(monthlyCost || 0);

  return (
    <Card className="bg-white/80">
      <div className="flex items-center justify-between">
        <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
        <span className="rounded-full bg-turquoise/20 px-3 py-1 text-xs font-semibold text-teal">
          {formatRunway(runway)}
        </span>
      </div>
      <p className="mt-3 text-sm text-charcoal/70">
        PPP-adjusted cost ≈ {formattedCost} /mo
      </p>
      <Progress value={percent} className="mt-4" />
      <p className="mt-2 text-xs text-charcoal/60">
        12 months = fully funded. Track your runway with PPP awareness.
      </p>
    </Card>
  );
}

export default RunwayCard;
