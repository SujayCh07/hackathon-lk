import { motion } from 'framer-motion';
import { useParallax } from '../../hooks/useParallax.js';
import { Card } from '../ui/Card.jsx';

const items = [
  {
    title: 'PPP Score',
    description: 'Compare real purchasing power across destinations to unlock hidden value.',
    accent: 'PPP'
  },
  {
    title: 'GeoBudget',
    description: 'Plan your runway with live PPP multipliers and FX insights.',
    accent: 'Runway'
  },
  {
    title: 'Smart-Spend',
    description: 'See how your spending categories stretch overseas and locally.',
    accent: 'Insights'
  }
];

export function ParallaxSection() {
  const { style } = useParallax(0.2);

  return (
    <section className="relative mt-12 overflow-hidden rounded-[2.5rem] border border-white/40 bg-blush/70 py-16 shadow-xl shadow-navy/10">
      <motion.div
        style={style}
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy/20 via-red/10 to-sky/20"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="bg-white/70 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-navy/60">{item.accent}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate">{item.title}</h3>
            <p className="mt-3 text-sm text-slate/70">{item.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default ParallaxSection;
