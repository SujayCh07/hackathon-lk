import { forwardRef, useMemo } from 'react';
import { Card } from '../ui/Card.jsx';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) ?? 0);
}

function getFlagEmoji(name) {
  if (!name) return '🌍';
  const country = name.split(',')[0].trim().toUpperCase();
  if (country.length !== 2) return '🌍';
  const codePoints = [...country].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const ShareSummary = forwardRef(function ShareSummary({ bestCity, score, balance, baselineCountry }, ref) {
  const flagSource = bestCity?.code ?? bestCity?.countryCode ?? bestCity?.country ?? '';
  const flag = useMemo(() => getFlagEmoji(flagSource), [flagSource]);
  const savingsLabel = bestCity?.savings != null ? `${Math.round(bestCity.savings)}% savings` : 'Savings ready';

  return (
    <Card
      ref={ref}
      className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-br from-white via-sky/20 to-offwhite text-center shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/40 px-6 py-4 text-xs uppercase tracking-[0.4em] text-teal/70">
        <span>{baselineCountry} • PPP passport</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
      <div className="px-8 py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-turquoise/20 text-3xl">{flag}</div>
        <h2 className="mt-4 text-3xl font-poppins font-semibold text-teal">Your travel power snapshot</h2>
        <p className="mt-3 text-sm text-charcoal/70">
          Balance {formatCurrency(balance)} · PPP score <span className="font-semibold text-turquoise">{score}</span>
        </p>
        <div className="mt-6 rounded-3xl border border-teal/40 bg-white/80 px-6 py-5 shadow-inner shadow-teal/10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal/70">Best destination</p>
          <h3 className="mt-2 text-2xl font-poppins font-semibold text-teal">{bestCity?.city ?? 'Loading'}</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-coral/70">{savingsLabel}</p>
          <p className="mt-3 text-sm text-charcoal/70">
            Stretch your budget longer in {bestCity?.city}. PPP score advantage lets you bank the difference.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 text-left text-xs text-charcoal/60">
          <div>
            <p className="font-semibold text-charcoal">GeoBudget insight</p>
            <p>Longest runway: {bestCity?.runwayLabel ?? 'Ready when you are'}.</p>
          </div>
          <div>
            <p className="font-semibold text-charcoal">Smart-Spend cue</p>
            <p>Reallocate {bestCity?.savings > 0 ? 'savings' : 'funds'} to experiences without breaking budget.</p>
          </div>
        </div>
      </div>
    </Card>
  );
});

export default ShareSummary;
