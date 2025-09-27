import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../ui/Button.jsx";
import { Link } from "react-router-dom";
import { useParallax } from "../../hooks/useParallax.js";
import logo from "../../assets/logo.png";

import Paris from "../../assets/cities/paris.jpg";
import Lisbon from "../../assets/cities/lisbon.jpg";
import MexicoCity from "../../assets/cities/mexicocity.jpg";
import Bangkok from "../../assets/cities/bangkok.jpg";
import NewYork from "../../assets/cities/newyork.jpg";
import London from "../../assets/cities/london.jpg";
import Tokyo from "../../assets/cities/tokyo.jpg";
import Dubai from "../../assets/cities/dubai.jpg";

const slides = [
  { city: "Paris", country: "France", image: Paris },
  { city: "Lisbon", country: "Portugal", image: Lisbon },
  { city: "Mexico City", country: "Mexico", image: MexicoCity },
  { city: "Bangkok", country: "Thailand", image: Bangkok },
  { city: "New York", country: "United States", image: NewYork },
  { city: "London", country: "United Kingdom", image: London },
  { city: "Tokyo", country: "Japan", image: Tokyo },
  { city: "Dubai", country: "United Arab Emirates", image: Dubai },
];

/**
 * Smoother, slower slide:
 * - minor horizontal pan + crossfade (less jank than full 100% slides)
 * - long ease curve, GPU-friendly
 */
const imageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "8%" : "-8%",
    opacity: 0,
    scale: 1.04,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? "-8%" : "8%",
    opacity: 0,
    scale: 1.02,
  }),
};

const captionVariants = {
  enter: { y: 18, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -18, opacity: 0 },
};

export function HeroCarousel({ showLogo = false }) {
  const [[index, direction], setSlideState] = useState([0, 0]);
  const { style: parallaxStyle } = useParallax(0.15);

  // Preload images to avoid decode jank
  useEffect(() => {
    slides.forEach((s) => {
      const i = new Image();
      i.src = s.image;
      i.decoding = "async";
      // @ts-ignore
      i.fetchpriority = "low";
    });
  }, []);

  const goToSlide = useCallback((targetIndex) => {
    setSlideState(([prevIndex]) => {
      const total = slides.length;
      const normalized = ((targetIndex % total) + total) % total;
      const nextDirection = normalized > prevIndex ? 1 : -1;
      return [normalized, nextDirection];
    });
  }, []);

  // Slower auto-advance (9s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideState(([prevIndex]) => [(prevIndex + 1) % slides.length, 1]);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const activeSlide = slides[index];

  return (
    <section
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-charcoal text-offwhite"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured destinations"
    >
      {/* Background slider */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={activeSlide.city}
            src={activeSlide.image}
            alt={`${activeSlide.city} skyline`}
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { duration: 3.2, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 1.8, ease: "easeInOut" },
              scale: { duration: 3.2, ease: [0.22, 1, 0.36, 1] },
            }}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
            style={parallaxStyle}
            decoding="async"
            loading="eager"
            sizes="100vw"
          />
        </AnimatePresence>

        {/* Capital One–ish overlays (readability) */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/45 via-transparent to-red/30" />
      </div>

      {/* Central content — no clunky box; soft radial glow behind text */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <div className="relative w-full max-w-4xl mx-auto">
          {/* subtle behind-text glow only */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-16 -inset-y-10 -z-10 rounded-[2rem]
                       bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55),rgba(0,0,0,0.25)_45%,transparent_70%)]
                       blur-sm"
          />
          <motion.div
            key={`${activeSlide.city}-content`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex w-full flex-col items-center gap-6"
          >
            {showLogo && (
              <div className="flex items-center justify-center">
                <img
                  src={logo}
                  alt="Parity logo"
                  className="h-12 w-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
                />
              </div>
            )}
            <span className="rounded-full bg-white/15 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-offwhite/90">
              Global PPP intelligence
            </span>
            <h1 className="font-poppins text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
              Same dollars, smarter world.
            </h1>
            <p className="max-w-2xl text-base text-offwhite/90 sm:text-lg">
              See where your money goes the farthest with PPP-adjusted insights across the globe.
            </p>
            <Button
              as={Link}
              to="/dashboard"
              variant="primary"
              className="text-base shadow-lg transition-all duration-300 hover:translate-y-[-2px]
                         hover:bg-gradient-to-r hover:from-red hover:to-navy focus-visible:ring-4
                         focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            >
              Connect my Capital One Account
            </Button>
          </motion.div>
        </div>
      </div>

      {/* City caption (no background box) */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`${activeSlide.city}-caption`}
          custom={direction}
          variants={captionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute bottom-[20%] left-8 sm:left-12"
        >
          <p className="font-poppins text-4xl sm:text-5xl font-extrabold uppercase tracking-[0.25em] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]">
            {activeSlide.city}
          </p>
          <p className="text-sm sm:text-base font-medium uppercase tracking-[0.35em] text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]">
            {activeSlide.country}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dots — moved up */}
      <nav className="absolute bottom-[12%] flex gap-3" aria-label="Carousel slide controls">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => goToSlide(idx)}
            className={`h-2 w-10 rounded-full transition-all focus-visible:outline focus-visible:outline-2 
                        focus-visible:outline-offset-2 focus-visible:outline-offwhite ${
                          idx === index ? "bg-offwhite" : "bg-white/40"
                        }`}
            aria-label={`Show ${slide.city}`}
          />
        ))}
      </nav>
    </section>
  );
}

export default HeroCarousel;
