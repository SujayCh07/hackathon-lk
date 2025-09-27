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

export function SavingsRunwayPanel({ destinations = [], stayLengthMonths = 6 }) {
  const topThree = destinations.slice(0, 3);

  return (
    <Card className="bg-white/85">
      <CardHeader>
        <CardTitle>Savings runway</CardTitle>
        <p className="text-sm text-charcoal/70">
          At your budget you could sustain this lifestyle for <strong>{stayLengthMonths}</strong> month
          {stayLengthMonths === 1 ? '' : 's'}.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {topThree.map((destination) => (
            <li key={destination.city} className="flex items-start justify-between rounded-2xl bg-offwhite/70 px-4 py-3 shadow-sm">
              <div>
                <p className="font-semibold text-teal">{destination.city}</p>
                <p className="text-xs text-charcoal/60">
                  PPP score {destination.ppp?.toFixed?.(0) ?? '—'} · {destination.context ?? 'Balanced cost breakdown'}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-charcoal">{formatRunway(destination.runwayMonths)}</p>
                <p className="text-xs text-charcoal/60">${Number(destination.monthlyCost ?? 0).toLocaleString()}/mo</p>
              </div>
            </li>
          ))}
          {topThree.length === 0 && (
            <li className="rounded-2xl border border-dashed border-navy/20 px-4 py-6 text-center text-sm text-charcoal/60">
              We’ll surface destinations once your PPP feed is ready.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

export default SavingsRunwayPanel;
