import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

function formatRunway(months) {
  if (!Number.isFinite(months) || months <= 0) return 'N/A';
  const years = Math.floor(months / 12);
  const remainingMonths = Math.round((months % 12) * 10) / 10;
  if (years <= 0) return `${months.toFixed(1)} months`;
  const parts = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths.toFixed(1)} month${remainingMonths !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

export function SavingsRunwayPanel({
  destinations = [],
  stayLengthMonths = 6,
  icon: Icon,
  subtitle,
  className,
  emptyStateMessage = 'We’ll surface destinations once your PPP feed is ready.',
}) {
  const topThree = destinations.slice(0, 3);

  return (
    <Card
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1f3f]/95 via-[#123d70]/85 to-[#f5f8ff]/95 shadow-lg shadow-[#052962]/20 ring-1 ring-white/20 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_top,_rgba(5,41,98,0.25),transparent_65%)] after:pointer-events-none after:absolute after:-left-12 after:top-1/3 after:h-32 after:w-32 after:rounded-full after:bg-[#e31837]/10 after:blur-3xl hover:shadow-2xl hover:shadow-[#052962]/30 hover:ring-[#e31837]/20',
        'transform-gpu transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01]',
        className
      )}
    >
      <CardHeader className="mb-6 flex items-start gap-4">
        {Icon && (
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 text-[#052962] ring-1 ring-white/40">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </span>
        )}
        <div>
          <CardTitle className="text-xl font-semibold text-white drop-shadow-sm">Savings runway</CardTitle>
          <p className="text-sm text-white/80">
            {subtitle ?? (
              <>
                At your budget you could sustain this lifestyle for{' '}
                <strong className="font-semibold text-[#ffccd5]">{stayLengthMonths}</strong> month
                {stayLengthMonths === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-white/85">
        <ul className="space-y-4">
          {topThree.map((destination) => (
            <li
              key={destination.city}
              className="flex items-start justify-between gap-4 rounded-2xl bg-white/15 px-5 py-4 text-sm ring-1 ring-white/25 backdrop-blur-sm"
            >
              <div>
                <p className="text-base font-semibold text-white drop-shadow">{destination.city}</p>
                <p className="mt-1 text-xs text-white/80">
                  PPP score <span className="font-semibold text-[#e0ecff]">{destination.ppp?.toFixed?.(0) ?? '—'}</span> ·{' '}
                  {destination.context ?? 'Balanced cost breakdown'}
                </p>
              </div>
              <div className="text-right text-sm text-white">
                <p className="font-semibold tracking-wide">{formatRunway(destination.runwayMonths)}</p>
                <p className="text-xs text-white/75">${Number(destination.monthlyCost ?? 0).toLocaleString()}/mo</p>
              </div>
            </li>
          ))}
          {topThree.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/40 bg-white/10 px-6 py-8 text-center text-sm text-white/80">
              {emptyStateMessage}
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default SavingsRunwayPanel;
