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
  const { style } = useParallax(0.18);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-offwhite via-offwhite/60 to-mist/80 py-16">
      <motion.div
        style={style}
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,_rgba(0,40,120,0.18),_transparent_55%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="bg-white/80 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-navy/60">{item.accent}</p>
            <h3 className="font-poppins mt-2 text-2xl font-semibold text-slate">{item.title}</h3>
            <p className="mt-3 text-base text-slate/70">{item.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default ParallaxSection;
