import { Card } from '../ui/Card.jsx';

export function CategoryTile({ title, description, delta, recommendation }) {
  const deltaLabel = delta >= 0 ? `Save ${delta.toFixed(0)}%` : `Spend ${Math.abs(delta).toFixed(0)}% more`;
  const deltaColor = delta >= 0 ? 'text-teal' : 'text-coral';

  return (
    <Card className="bg-white/85">
      <h4 className="font-poppins text-lg font-semibold text-charcoal">{title}</h4>
      <p className="mt-2 text-sm text-charcoal/70">{description}</p>
      <p className={`mt-3 text-sm font-semibold ${deltaColor}`}>{deltaLabel}</p>
      {recommendation && <p className="mt-3 text-xs text-charcoal/60">{recommendation}</p>}
    </Card>
  );
}

export default CategoryTile;
