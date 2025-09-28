import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';
import capitals from './capitals.js';

const CATEGORY_LABELS = {
  rent: 'Rent',
  food: 'Food',
  transport: 'Transport',
  leisure: 'Leisure',
};

function toNumber(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  const s = String(value).trim().replace(',', '.');
  const cleaned = s.replace(/[^\d.-]/g, '');
  return Number(cleaned);
}

function formatRunway(runway) {
  const num = toNumber(runway);
  if (!Number.isFinite(num) || num <= 0) return '0.0 months';

  if (num < 1) {
    const days = Math.max(1, Math.round(num * 30));
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  if (num < 12) {
    const isInteger = Math.abs(num - Math.round(num)) < 1e-9;
    if (isInteger) {
      const intMonths = Math.round(num);
      return `${intMonths} month${intMonths === 1 ? '' : 's'}`;
    }
    return `${num.toFixed(1)} month${Math.abs(num - 1) < 1e-9 ? '' : 's'}`;
  }

  const years = Math.floor(num / 12);
  const monthsPartRaw = (num % 12);
  const monthsPart = Math.round(monthsPartRaw * 10) / 10;
  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (monthsPart > 0) {
    const isIntMonths = Math.abs(monthsPart - Math.round(monthsPart)) < 1e-9;
    parts.push(
      isIntMonths
        ? `${Math.round(monthsPart)} month${Math.round(monthsPart) === 1 ? '' : 's'}`
        : `${monthsPart.toFixed(1)} months`
    );
  }
  return parts.join(' ');
}

function formatCurrency(amount, currency) {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function RunwayCard({
  city,
  country,
  runway,
  monthlyCost,
  currency = 'USD',
  stayDurationMonths = 6,
  breakdown = {},
  continent,
  isHighlighted = false,
  badgeLabel = null,
}) {
  const runwayNum = toNumber(runway);
  const durationNum = toNumber(stayDurationMonths);
  const percent =
    Number.isFinite(runwayNum) && Number.isFinite(durationNum) && durationNum > 0
      ? Math.min(100, (runwayNum / durationNum) * 100)
      : 0;

  const monthCostNum = toNumber(monthlyCost);
  const stayCost = Number.isFinite(monthCostNum) && Number.isFinite(durationNum)
    ? monthCostNum * durationNum
    : NaN;

  const segments = Object.entries(breakdown);
  const normalizedCountry = country?.toLowerCase?.() ?? '';
  const capital = capitals[normalizedCountry];
  const countryName = capitalizeFirstLetter(country);
  const infoLine = capital
    ? `Estimated cost of living in ${capital}, ${countryName}`
    : `Estimated cost of living in ${countryName}`;

  const sortedSegments = segments.slice().sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  return (
    <Card
      className={`relative flex h-full flex-col justify-between rounded-3xl bg-white/90 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
        isHighlighted ? 'ring-2 ring-teal shadow-lg' : ''
      }`}
    >
      {badgeLabel && (
        <span className="absolute -top-3 left-4 rounded-full bg-coral px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md">
          {badgeLabel}
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
            <p className="mt-1 text-xs text-charcoal/60">{infoLine}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-charcoal/60">
            {continent && (
              <span className="rounded-full bg-turquoise/20 px-2 py-1 text-teal">{continent}</span>
            )}
          </div>
        </div>
        <span className="rounded-full bg-turquoise/20 px-3 py-1 text-xs font-semibold text-teal">
          {formatRunway(runwayNum)}
        </span>
      </div>

      <p className="mt-3 text-sm text-charcoal/70">
        {formatCurrency(monthCostNum, currency)} /mo · {formatCurrency(stayCost, currency)} total for{' '}
        {formatRunway(durationNum)}
      </p>

      <Progress value={percent} className="mt-4" />

      <div className="mt-3 flex items-start gap-2 text-xs text-charcoal/70">
        <InformationCircleIcon className="mt-0.5 h-4 w-4 text-teal" aria-hidden="true" />
        <div className="w-full">
          {sortedSegments.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {sortedSegments.map(([label, value]) => {
                const key = String(label).toLowerCase();
                const displayLabel = CATEGORY_LABELS[key] ?? label;

                return (
                  <li
                    key={label}
                    className="rounded-xl bg-turquoise/15 px-3 py-2 text-left text-sm text-charcoal/80"
                  >
                    <p className="font-semibold text-teal">{displayLabel}</p>
                    <p className="text-xs text-charcoal/60">
                      Approximate share of monthly budget: {Math.round((value ?? 0) * 100)}%
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No budget breakdown available.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default RunwayCard;
