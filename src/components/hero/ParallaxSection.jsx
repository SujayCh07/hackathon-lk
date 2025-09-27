import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// Use any high-quality images you already have in /assets/cities (or swap to product shots)
import London from "../../assets/cities/london.jpg";
import Lisbon from "../../assets/cities/lisbon.jpg";
import Bangkok from "../../assets/cities/bangkok.jpg";

const rows = [
  {
    eyebrow: "PPP SCORE",
    title: "See the real worth of your balance—anywhere.",
    body:
      "Parity converts your Capital One balance into local purchasing power with PPP benchmarks. No guesswork—just what your money can actually buy.",
    points: [
      "Country-by-country value equivalents (e.g., $1 in NYC ≈ $1.45 in Mexico City).",
      "One tap to compare cities side-by-side.",
      "Built for clarity—no FX jargon.",
    ],
    icon: CurrencyDollarIcon,
    cta: { label: "Explore PPP Score", to: "/score" },
    image: London,
  },
  {
    eyebrow: "GEOBUDGET",
    title: "Plan your runway with PPP + live FX.",
    body:
      "Forecast months of travel by destination. Combine PPP multipliers and live FX so your budget matches reality, not vibes.",
    points: [
      "Auto-budget by city, category, or date range.",
      "What-if sliders: adjust spend and instantly see runway.",
      "Export itineraries to share with travel partners.",
    ],
    icon: GlobeAltIcon,
    cta: { label: "Open GeoBudget", to: "/geobudget" },
    image: Lisbon,
  },
  {
    eyebrow: "SMART-SPEND",
    title: "Know which categories stretch further abroad.",
    body:
      "Link Capital One transactions and see where dining, transit, and lodging go further—locally vs. overseas—so you spend with confidence.",
    points: [
      "Category heatmap with PPP adjustments.",
      "Merchant-level insights and gentle alerts.",
      "Tips to optimize rewards + reduce fees.",
    ],
    icon: ChartBarIcon,
    cta: { label: "View Smart-Spend", to: "/smart-spend" },
    image: Bangkok,
  },
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function ParallaxSection() {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-offwhite via-offwhite/70 to-white py-20 sm:py-28"
      aria-label="Parity features"
    >
      {/* Subtle brand wash + “swoosh” accent */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_-10%,rgba(0,40,120,0.10),transparent_60%)]" />
      <SwooshDecoration />

      {/* Section header */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mx-auto mb-12 max-w-5xl px-6 text-center sm:mb-16"
      >
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.35em] text-navy/70">
          Digital tools built for ease
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          Save time, plan smarter, and spend with confidence
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg text-slate/75">
          Parity reframes your Capital One balance as a global compass—so your
          travel plans start with real purchasing power, not guesswork.
        </p>
      </motion.div>

      {/* Alternating media/text rows (Capital One style) */}
      <div className="mx-auto flex max-w-6xl flex-col gap-20 px-6">
        {rows.map((row, idx) => (
          <FeatureRow key={row.title} row={row} reverse={idx % 2 === 1} />
        ))}
      </div>

      {/* Sticky CTA banner */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto mt-20 max-w-5xl px-6"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-red p-1 shadow-xl">
          <div className="rounded-[1rem] bg-white/10 p-6 text-center backdrop-blur-sm sm:p-8">
            <h3 className="text-2xl font-semibold text-white">
              Turn your balance into a global travel compass.
            </h3>
            <p className="mt-2 text-white/85">
              Connect your Capital One account to get PPP-adjusted insights in
              minutes.
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-medium text-navy shadow hover:shadow-md"
              >
                Connect my Capital One Account
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/** A single alternating feature row */
function FeatureRow({ row, reverse = false }) {
  const Icon = row.icon;
  return (
    <div
      className={`grid grid-cols-1 items-center gap-8 md:grid-cols-12 ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      {/* Media */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="md:col-span-6"
      >
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <img
            src={row.image}
            alt=""
            className="h-[320px] w-full object-cover transition-transform duration-700 ease-out hover:scale-105 sm:h-[380px]"
            loading="lazy"
          />
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="md:col-span-6"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.35em] text-navy/70">
          {row.eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate sm:text-3xl">
          {row.title}
        </h3>
        <p className="mt-3 text-slate/75">{row.body}</p>

        <ul className="mt-5 space-y-2">
          {row.points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-slate/80">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-navy to-red text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Link
            to={row.cta.to}
            className="inline-flex items-center gap-2 text-navy hover:text-red"
            aria-label={row.cta.label}
          >
            {row.cta.label}
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

/** subtle “swoosh” accent behind header, Capital One vibe */
function SwooshDecoration() {
  return (
    <svg
      className="pointer-events-none absolute -top-10 right-[-120px] h-[280px] w-[560px] opacity-30"
      viewBox="0 0 560 280"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 230C190 120 360 90 540 60"
        stroke="url(#g)"
        strokeWidth="30"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="g" x1="20" y1="230" x2="540" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0A2A6B" />
          <stop offset="1" stopColor="#D21F3C" />
        </linearGradient>
      </defs>
    </svg>
  );
}
