import { motion } from "framer-motion";
import { useParallax } from "../../hooks/useParallax.js";
import { Card } from "../ui/Card.jsx";
import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline"; // using Heroicons for clean, simple SVGs

const items = [
  {
    title: "PPP Score",
    description:
      "See the true strength of your Capital One balance anywhere in the world. Instantly compare local purchasing power with global parity benchmarks.",
    accent: "Value",
    icon: CurrencyDollarIcon,
  },
  {
    title: "GeoBudget",
    description:
      "Plan your travel runway in real time. Combine PPP multipliers with live FX rates to forecast how long your money will last in any destination.",
    accent: "Runway",
    icon: GlobeAltIcon,
  },
  {
    title: "Smart-Spend",
    description:
      "Track and optimize how your Capital One transactions stretch across categories. Discover which expenses go further overseas versus at home.",
    accent: "Insights",
    icon: ChartBarIcon,
  },
];

export function ParallaxSection() {
  const { style } = useParallax(0.18);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-offwhite via-offwhite/60 to-mist/80 py-20 sm:py-28">
      <motion.div
        style={style}
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,_rgba(0,40,120,0.18),_transparent_55%)]"
        aria-hidden="true"
      />

      {/* Section intro */}
      <div className="mx-auto max-w-5xl px-6 text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Smarter travel, powered by Capital One
        </h2>
        <p className="mt-4 text-lg text-slate/70">
          Purchasing Power Parity reframes your balance as a global compass.
          With real-time FX hooks and local value insights, PPP Pocket helps you
          travel confidently — and spend intelligently.
        </p>
      </div>

      {/* Cards */}
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.title}
            className="flex flex-col items-start bg-white/90 p-6 shadow-lg backdrop-blur hover:shadow-xl transition-shadow"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-navy to-red text-white shadow-md">
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-navy/70">
              {item.accent}
            </p>
            <h3 className="font-poppins mt-2 text-2xl font-semibold text-slate">
              {item.title}
            </h3>
            <p className="mt-3 text-base text-slate/70">{item.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default ParallaxSection;
