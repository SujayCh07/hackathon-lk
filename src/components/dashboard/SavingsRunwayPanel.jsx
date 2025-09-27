import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

function PiggyBankIcon({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M8.25 7.5a5.25 5.25 0 0 1 10.12-1.5H20.5a1 1 0 0 1 1 1v2.232a1 1 0 0 0 .293.707l.457.457a1.5 1.5 0 0 1 0 2.122l-.97.97a3 3 0 0 1-1.226.74l-.754.218a1 1 0 0 0-.73.962V16.5a3.75 3.75 0 0 1-3.75 3.75h-5.25A3.75 3.75 0 0 1 6.77 17.29l-.27.01A2.25 2.25 0 0 1 4.25 15.06v-2.713a2.25 2.25 0 0 1 .534-1.44l1.916-2.334a5.22 5.22 0 0 1 1.55-1.073Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 9h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 15a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

export function SavingsRunwayPanel({ destinations = [], stayLengthMonths = 6, className }) {
  const topThree = destinations.slice(0, 3);

  return (
    <Card
      className={clsx(
        'relative h-full rounded-2xl border border-white/30 bg-gradient-to-br from-[#052962]/15 via-[#e0ecff]/60 to-white/95 text-slate/80 shadow-lg shadow-navy/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/25',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_right,rgba(9,80,166,0.18),transparent_70%)]"
      />
      <CardHeader className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052962]/10 text-[#052962]">
          <PiggyBankIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <CardTitle className="text-lg font-semibold text-[#052962]">Savings summary</CardTitle>
          <p className="text-sm text-slate/70">
            Your travel kitty can sustain <strong className="font-semibold text-[#052962]">{stayLengthMonths}</strong>{' '}
            month{stayLengthMonths === 1 ? '' : 's'} of adventure.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-4">
          {topThree.map((destination) => (
            <li
              key={destination.city}
              className="flex flex-col gap-3 rounded-2xl border border-[#0f3b75]/10 bg-white/55 px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#052962]">{destination.city}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#1e4b93]/70">
                  PPP {destination.ppp?.toFixed?.(0) ?? '—'} · {destination.context ?? 'Balanced cost breakdown'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-semibold text-[#052962]">
                  {formatRunway(destination.runwayMonths)}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#e31837]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#e31837]">
                  ${Number(destination.monthlyCost ?? 0).toLocaleString()}/mo
                </p>
              </div>
            </li>
          ))}
          {topThree.length === 0 && (
            <li className="rounded-2xl border border-dashed border-[#0f3b75]/30 bg-white/40 px-4 py-6 text-center text-sm text-slate/70">
              No savings insights yet. Connect your PPP data to unlock runway projections.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default SavingsRunwayPanel;
