import { motion } from "framer-motion";
import { useParallax } from "../../hooks/useParallax.js";
import { Card } from "../ui/Card.jsx";

const CurrencyIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.5}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.25" />
    <path d="M9 9.75h6" />
    <path d="M9 14.25h5" />
    <path d="M12 7.5v9" />
  </svg>
);

const GlobeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.5}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="8.25" />
    <path d="M3.75 12h16.5" />
    <path d="M12 3.75c3 3.75 3 12.75 0 16.5" />
    <path d="M12 3.75c-3 3.75-3 12.75 0 16.5" />
  </svg>
);

const InsightsIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth={1.5}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M4.5 19.5h15" />
    <path d="M7.5 19.5v-6.75" />
    <path d="M12 19.5V7.5" />
    <path d="M16.5 19.5V11.25" />
  </svg>
);

const items = [
  {
    title: "Parity Score",
    description:
      "See the true strength of your Capital One balance anywhere in the world. Instantly compare local purchasing power with global parity benchmarks.",
    accent: "Value",
    icon: CurrencyIcon,
  },
  {
    title: "GeoBudget",
    description:
      "Plan your travel runway in real time. Combine PPP multipliers with live FX rates to forecast how long your money will last in any destination.",
    accent: "Runway",
    icon: GlobeIcon,
  },
  {
    title: "Smart-Spend",
    description:
      "Track and optimize how your Capital One transactions stretch across categories. Discover which expenses go further overseas versus at home.",
    accent: "Insights",
    icon: InsightsIcon,
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
      <div className="mx-auto mb-12 max-w-5xl px-6 text-center sm:mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Smarter travel, powered by Capital One
        </h2>
        <p className="mt-4 text-lg text-slate/70">
          Purchasing Power Parity reframes your balance as a global compass.
          With real-time FX hooks and local value insights, Parity helps you
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
              <item.icon className="h-6 w-6" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-navy/60">
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
