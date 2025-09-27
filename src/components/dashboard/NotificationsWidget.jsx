import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  SparklesIcon,
  BullseyeIcon,
} from '@heroicons/react/24/outline';

const ICON_MAP = {
  globe: GlobeAltIcon,
  'trending-up': ArrowTrendingUpIcon,
  'trending-down': ArrowTrendingDownIcon,
  sparkles: SparklesIcon,
  alert: ExclamationTriangleIcon,
  'chart-pie': ChartPieIcon,
  target: BullseyeIcon,
};

const VARIANT_STYLES = {
  positive: 'border-teal/30 bg-teal/5 text-teal-700',
  warning: 'border-coral/40 bg-coral/5 text-coral-700',
  info: 'border-navy/10 bg-navy/5 text-charcoal/80',
};

export function NotificationsWidget({ items = [] }) {
  const nudges = items.filter(Boolean);
  return (
    <Card className="bg-white/85">
      <CardHeader>
        <CardTitle>Latest nudges</CardTitle>
        <p className="text-sm text-charcoal/70">We turn PPP swings into actionable moves.</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {nudges.map((nudge, index) => {
            const key = nudge?.slug ?? `nudge-${index}`;
            const Icon = ICON_MAP[nudge?.icon] ?? SparklesIcon;
            const variant = VARIANT_STYLES[nudge?.variant] ?? VARIANT_STYLES.info;
            return (
              <li
                key={key}
                className={`rounded-2xl border px-4 py-4 text-sm shadow-sm ${variant}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/70">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-charcoal/60">{nudge?.title}</p>
                    <p className="mt-1 text-sm text-charcoal">{nudge?.message}</p>
                    {nudge?.actionLabel && nudge?.actionHref && (
                      <a
                        href={nudge.actionHref}
                        className="mt-2 inline-flex text-xs font-semibold text-teal hover:underline"
                      >
                        {nudge.actionLabel}
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {nudges.length === 0 && (
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
