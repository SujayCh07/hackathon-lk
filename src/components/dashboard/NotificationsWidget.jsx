import clsx from 'clsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

export function NotificationsWidget({
  items = [],
  icon: Icon,
  title = 'Latest nudges',
  subtitle = 'We turn PPP swings into actionable moves.',
  emptyStateMessage = "Once we have enough data we’ll start dropping personalised travel plays here.",
  className,
}) {
  const messages = items.filter(Boolean);
  return (
    <Card
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1f3f]/95 via-[#123d70]/85 to-[#f5f8ff]/95 shadow-lg shadow-[#052962]/20 ring-1 ring-white/20 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_top,_rgba(227,24,55,0.12),transparent_60%)] after:pointer-events-none after:absolute after:-right-10 after:-top-10 after:h-24 after:w-24 after:rounded-full after:bg-[#e31837]/10 after:blur-2xl hover:shadow-2xl hover:shadow-[#052962]/30 hover:ring-[#e31837]/20 sm:after:h-32 sm:after:w-32',
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
          <CardTitle className="text-xl font-semibold text-white drop-shadow-sm">{title}</CardTitle>
          {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-white/85">
        <ul className="space-y-3">
          {messages.map((message, index) => (
            <li
              key={`${message}-${index}`}
              className="flex items-start gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left text-sm text-white ring-1 ring-white/30 backdrop-blur-sm"
            >
              <span
                className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-[#e31837] shadow shadow-[#e31837]/40"
                aria-hidden="true"
              />
              <p className="leading-relaxed">{message}</p>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="rounded-2xl border border-dashed border-white/40 bg-white/10 px-6 py-8 text-center text-sm text-white/80">
              {emptyStateMessage}
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default NotificationsWidget;
