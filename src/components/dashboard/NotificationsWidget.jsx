import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

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
          {messages.map((message, index) => (
            <li
              key={`${message}-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-teal/20 bg-turquoise/10 px-4 py-3 text-sm text-charcoal"
            >
              <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal" aria-hidden="true" />
              <p>{message}</p>
            </li>
          ))}
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
