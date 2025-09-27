import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  GlobeAmericasIcon,
  StarIcon,
  BanknotesIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

const ICON_MAP = {
  sparkles: SparklesIcon,
  'trending-up': ArrowTrendingUpIcon,
  'trending-down': ArrowTrendingDownIcon,
  warning: ExclamationTriangleIcon,
  globe: GlobeAmericasIcon,
  star: StarIcon,
  'piggy-bank': BanknotesIcon,
};

const TONE_STYLES = {
  positive: { wrapper: 'border-teal/25 bg-teal/10', badge: 'bg-teal/15 text-teal' },
  caution: { wrapper: 'border-amber/25 bg-amber/10', badge: 'bg-amber/15 text-amber-700' },
  warning: { wrapper: 'border-coral/30 bg-coral/10', badge: 'bg-coral/15 text-coral' },
  info: { wrapper: 'border-sky/25 bg-sky/10', badge: 'bg-sky/15 text-sky-700' },
  default: { wrapper: 'border-navy/10 bg-white', badge: 'bg-navy/10 text-navy' },
};

function resolveTone(tone) {
  return TONE_STYLES[tone] ?? TONE_STYLES.default;
}

export function NotificationsWidget({ items = [] }) {
  const messages = items.filter(Boolean);
  return (
    <Card className="bg-white/85">
      <CardHeader>
        <CardTitle>Latest nudges</CardTitle>
        <p className="text-sm text-charcoal/70">We turn PPP swings into actionable moves.</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {messages.map((nudge, index) => {
            const Icon = ICON_MAP[nudge.icon] ?? InformationCircleIcon;
            const tone = resolveTone(nudge.tone);
            return (
              <li
                key={nudge.id ?? `${index}-${nudge.message}`}
                className={`rounded-2xl border px-4 py-4 ${tone.wrapper}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.badge}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">{nudge.message}</p>
                    {nudge.subtitle && (
                      <p className="mt-1 text-xs text-charcoal/70">{nudge.subtitle}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-xs text-charcoal/60">
                      <span className="font-medium uppercase tracking-wide">{nudge.category ?? 'Nudge'}</span>
                      {nudge.actionLabel && nudge.actionHref && (
                        <Link to={nudge.actionHref} className="font-semibold text-teal hover:underline">
                          {nudge.actionLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {messages.length === 0 && (
            <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
              Once we have enough data we’ll start dropping personalised travel plays here.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default NotificationsWidget;
