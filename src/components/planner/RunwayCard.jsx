import { Card } from '../ui/Card.jsx';
import Progress from '../ui/Progress.jsx';

export function RunwayCard({ city, runway, monthlyCost, currency }) {
  const percent = Math.min(100, (runway / 12) * 100);
  return (
    <Card className="bg-white/80">
      <div className="flex items-center justify-between">
        <h4 className="font-poppins text-lg font-semibold text-teal">{city}</h4>
        <span className="rounded-full bg-turquoise/20 px-3 py-1 text-xs font-semibold text-teal">{runway.toFixed(1)} months</span>
      </div>
      <p className="mt-3 text-sm text-charcoal/70">PPP-adjusted cost ≈ {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(monthlyCost)} /mo</p>
      <Progress value={percent} className="mt-4" />
      <p className="mt-2 text-xs text-charcoal/60">12 months = fully funded. Track your runway with PPP awareness.</p>
    </Card>
  );
}

export default RunwayCard;
