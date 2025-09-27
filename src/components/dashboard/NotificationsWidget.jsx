import clsx from 'clsx';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

export function NotificationsWidget({ items = [], className }) {
  const messages = items.filter(Boolean);
  return (
    <Card
      className={clsx(
        'relative h-full rounded-2xl border border-white/30 bg-gradient-to-br from-[#052962]/15 via-[#e0ecff]/60 to-white/95 text-slate/80 shadow-lg shadow-navy/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-navy/25',
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(9,80,166,0.25),transparent_65%)]"
      />
      <CardHeader className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#052962]/10 text-[#052962]">
            <LightBulbIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-lg font-semibold text-[#052962]">Latest nudges</CardTitle>
            <p className="text-sm text-slate/70">We turn PPP swings into actionable moves.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {messages.map((message, index) => (
            <li
              key={`${message}-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-[#0f3b75]/10 bg-white/50 px-4 py-3 text-sm text-slate/80 shadow-sm"
            >
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#e31837]" aria-hidden="true" />
              <p>{message}</p>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="rounded-2xl border border-dashed border-[#0f3b75]/30 bg-white/40 px-4 py-6 text-center text-sm text-slate/70">
              No nudges yet. We’ll surface smart moves once your spending trends in.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default NotificationsWidget;
