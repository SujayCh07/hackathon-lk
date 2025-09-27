import { forwardRef } from 'react';
import { Card } from '../ui/Card.jsx';

export const ShareSummary = forwardRef(function ShareSummary({ bestCity, score, balance }, ref) {
  return (
    <Card ref={ref} className="mx-auto w-full max-w-xl bg-white/90 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-teal/70">PPP Pocket</p>
      <h2 className="mt-2 text-3xl font-poppins font-semibold text-teal">Your PPP summary</h2>
      <p className="mt-4 text-sm text-charcoal/70">
        With a balance of <span className="font-semibold text-teal">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(balance)}</span>, your purchasing power index
        scores <span className="font-semibold text-turquoise">{score}</span>.
      </p>
      <div className="mt-6 rounded-3xl border border-teal/30 bg-turquoise/10 px-6 py-5">
        <p className="text-xs uppercase tracking-[0.4em] text-teal/70">Best value destination</p>
        <h3 className="mt-2 text-2xl font-poppins font-semibold text-teal">{bestCity.city}</h3>
        <p className="mt-2 text-sm text-charcoal/70">Save up to {bestCity.savings.toFixed(0)}% vs. staying in Atlanta.</p>
      </div>
      <p className="mt-6 text-xs text-charcoal/60">Export this card as a PNG or PDF to share PPP insights with your travel crew.</p>
    </Card>
  );
});

export default ShareSummary;
