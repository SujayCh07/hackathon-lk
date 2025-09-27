import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';

function formatRunway(runway) {
  const num = Number(runway);
  if (!Number.isFinite(num) || num <= 0) return '0.0 months';
  if (num < 12) return `${num.toFixed(1)} months`;
  const years = Math.floor(num / 12);
  const months = Math.round((num % 12) * 10) / 10;
  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months.toFixed(1)} month${months !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

function formatCurrency(amount, currency) {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function RunwayCard({
  city,
  runway,
  monthlyCost,
  currency = 'USD',
  stayDurationMonths = 6,
  breakdown = {},
  isHighlighted = false,
  badgeLabel = null,
}) {
  const percent = Math.min(100, (Number(runway) / stayDurationMonths) * 100);
  const stayCost = Number(monthlyCost) * stayDurationMonths;

  const segments = Object.entries(breakdown);

  return (
    <Card
      className={`relative bg-white/85 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
        isHighlighted ? 'ring-2 ring-teal shadow-lg' : ''
      }`}
    >
      {(isHighlighted || badgeLabel) && (
        <span className="absolute -top-3 left-4 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white">
          {badgeLabel ?? 'Best pick'}
        </span>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
          <p className="mt-1 text-xs text-charcoal/60">PPP-adjusted budget fit</p>
        </div>
        <span className="rounded-full bg-turquoise/20 px-3 py-1 text-xs font-semibold text-teal">
          {formatRunway(runway)}
        </span>
      </div>
      <p className="mt-3 text-sm text-charcoal/70">
        {formatCurrency(monthlyCost, currency)} /mo · {formatCurrency(stayCost, currency)} for {stayDurationMonths} month
        {stayDurationMonths === 1 ? '' : 's'}
      </p>
      <Progress value={percent} className="mt-4" />
      <div className="mt-3 flex items-start gap-2 text-xs text-charcoal/70">
        <InformationCircleIcon className="mt-0.5 h-4 w-4 text-teal" aria-hidden="true" />
        <div>
          {segments.length > 0 ? (
            <ul className="space-y-1">
              {segments.map(([label, value]) => (
                <li key={label}>
                  <span className="font-semibold text-charcoal">{label}:</span> {Math.round(value * 100)}% of spend
                </li>
              ))}
            </ul>
          ) : (
            <p>We estimate your rent, food, and leisure mix using PPP data.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default RunwayCard;
