import { motion } from "framer-motion";
import { useParallax } from "../../hooks/useParallax.js";
import {
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// Images for each section (replace with your own high-quality ones in /assets
import PPPImage from "../../assets/ppp.jpg";
import GeoBudgetImage from "../../assets/geobudget.jpg";
import SmartSpendImage from "../../assets/smartspend.jpg";

const items = [
  {
    title: "PPP Score",
    subtitle: "Unlock global purchasing power",
    description:
      "See the strength of your Capital One balance anywhere in the world. Instantly compare local purchasing power with global parity benchmarks.",
    bullets: [
      "Live parity multipliers per city.",
      "Compare across destinations instantly.",
      "Maximize your dollars for experiences.",
    ],
    icon: CurrencyDollarIcon,
    image: PPPImage,
    accent: "Value",
  },
  {
    title: "GeoBudget",
    subtitle: "Plan your runway with PPP + live FX",
    description:
      "Forecast travel months by destination. Combine PPP multipliers and live FX so your budget matches reality, not vibes.",
    bullets: [
      "Auto-budget by city, category, or date.",
      "What-if sliders to instantly see runway.",
      "Export itineraries for partners.",
    ],
    icon: GlobeAltIcon,
    image: GeoBudgetImage,
    accent: "Runway",
  },
  {
    title: "Smart-Spend",
    subtitle: "Know which categories stretch further",
    description:
      "Track and optimize how your Capital One transactions stretch across categories. Discover which expenses go further overseas versus at home.",
    bullets: [
      "Category-level analysis by PPP.",
      "See overseas vs. local spend efficiency.",
      "Actionable insights for smarter trips.",
    ],
    icon: ChartBarIcon,
    image: SmartSpendImage,
    accent: "Insights",
  },
];

export function ParallaxSection() {
  const { style } = useParallax(0.15);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-offwhite to-mist/60 py-20 sm:py-28">
      {/* Decorative swoosh / background */}
      <motion.div
        style={style}
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,_rgba(0,40,120,0.1),_transparent_65%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl px-6 space-y-24">
        {items.map((item, idx) => (
          <div
            key={item.title}
            className={`grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center ${
              idx % 2 === 1 ? "md:grid-flow-dense" : ""
            }`}
          >
            {/* Text content */}
            <div className="space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-navy/70">
                {item.accent}
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate sm:text-4xl">
                {item.subtitle}
              </h2>
              <p className="text-lg text-slate/70">{item.description}</p>

              <ul className="mt-4 space-y-2 text-slate/80">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-navy" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <a
                href="/dashboard"
                className="inline-block text-navy font-semibold hover:text-red transition-colors mt-4"
              >
                Open {item.title} →
              </a>
            </div>

            {/* Supporting image */}
            <motion.img
              src={item.image}
              alt={`${item.title} visual`}
              className="rounded-2xl shadow-xl w-full object-cover"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default ParallaxSection;
