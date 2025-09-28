import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';
import capitals from './capitals.js';

const CATEGORY_META = {
  rent: { label: 'Rent', icon: '🏠' },
  food: { label: 'Food', icon: '🍔' },
  transport: { label: 'Transport', icon: '🚇' },
  leisure: { label: 'Leisure', icon: '🎉' },
};

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

function capitalizeFirstLetter(str) {
  if (!str) return "";
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function RunwayCard({
  city,
  country,
  runway,
  monthlyCost,
  currency = 'USD',
  stayDurationMonths = 6,
  breakdown = {},
  lifestyleTags = [],
  continent,
  safetyScore,
  funScore,
  isHighlighted = false,
  badgeLabel = null,
}) {
  const percent = Math.min(100, (Number(runway) / stayDurationMonths) * 100);
  const stayCost = Number(monthlyCost) * stayDurationMonths;
  const segments = Object.entries(breakdown);
  const normalizedCountry = country?.toLowerCase?.() ?? '';
  const capital = capitals[normalizedCountry];
  const countryName = capitalizeFirstLetter(country);
  const infoLine = capital
    ? `Estimated cost of living in ${capital}, ${countryName}`
    : `Estimated cost of living in ${countryName}`;

  const sortedSegments = segments.slice().sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const tagList = lifestyleTags.slice(0, 3);

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
            {continent && <span className="rounded-full bg-turquoise/20 px-2 py-1 text-teal">{continent}</span>}
            {tagList.map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2 py-1 text-teal/80 ring-1 ring-teal/20">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="rounded-full bg-turquoise/20 px-3 py-1 text-xs font-semibold text-teal">
            {formatRunway(runway)}
          </span>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-charcoal/60">
            <span className="rounded-full bg-white px-2 py-1 shadow-sm">🛡️ {safetyScore ?? 0}</span>
            <span className="rounded-full bg-white px-2 py-1 shadow-sm">🎈 {funScore ?? 0}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-charcoal/70">
        {formatCurrency(monthlyCost, currency)} /mo · {formatCurrency(stayCost, currency)} for{' '}
        {stayDurationMonths} month{stayDurationMonths === 1 ? '' : 's'}
      </p>

      <Progress value={percent} className="mt-4" />

      <div className="mt-3 flex items-start gap-2 text-xs text-charcoal/70">
        <InformationCircleIcon className="mt-0.5 h-4 w-4 text-teal" aria-hidden="true" />
        <div className="w-full">
          {sortedSegments.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {sortedSegments.map(([label, value]) => {
                const key = String(label).toLowerCase();
                const meta = CATEGORY_META[key] ?? {
                  label,
                  icon: '•',
                };

                return (
                  <li
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-turquoise/15 px-3 py-2 font-semibold text-charcoal"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      {meta.label}
                    </span>
                    <span className="text-teal">{Math.round((value ?? 0) * 100)}%</span>
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
