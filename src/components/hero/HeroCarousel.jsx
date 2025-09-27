import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "../ui/Button.jsx";
import { Link } from "react-router-dom";
import { useParallax } from "../../hooks/useParallax.js";

// City images
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

// Slide-only animation (no fading)
const imageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : "-100%",
    position: "absolute",
  }),
  center: {
    x: 0,
    position: "absolute",
  },
  exit: (direction) => ({
    x: direction > 0 ? "-100%" : "100%",
    position: "absolute",
  }),
};

const captionVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

export function HeroCarousel() {
  const [[index, direction], setSlideState] = useState([0, 0]);
  const { style: parallaxStyle } = useParallax(0.15);

  // Preload images
  useEffect(() => {
    slides.forEach((slide) => {
      const preload = new Image();
      preload.src = slide.image;
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

  // Auto advance
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideState(([prevIndex]) => [(prevIndex + 1) % slides.length, 1]);
    }, 6000); // slightly faster to sync with captions
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
      <motion.div className="absolute inset-0 overflow-hidden" style={parallaxStyle}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
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
              duration: 1.0,
              ease: "easeInOut",
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        {/* Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/40 via-transparent to-red/25" />
      </motion.div>

      {/* Central content (static) */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-xl bg-charcoal/55 px-6 py-8 text-center shadow-[0_20px_50px_rgba(6,16,40,0.4)] backdrop-blur-sm">
          <span className="rounded-full bg-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-offwhite/90">
            Global Parity Intelligence
          </span>
          <h1 className="font-poppins text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Spend smarter, travel farther.
          </h1>
          <p className="max-w-xl text-base text-offwhite/90 sm:text-lg">
            See where your money goes the farthest with PPP-adjusted insights across the globe.
          </p>
          <Button
            as={Link}
            to="/dashboard"
            variant="primary"
            className="text-base shadow-lg transition-all duration-500 ease-in-out transform hover:scale-105 hover:translate-y-[-3px] hover:bg-gradient-to-r hover:from-red hover:to-navy"
          >
            Connect my&nbsp;<span className="text-red-600">Capital One™</span>&nbsp;Account
          </Button>
        </div>
      </div>

      {/* City + Country captions (sliding in sync) */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`${activeSlide.city}-caption`}
          custom={direction}
          variants={captionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 1.0, ease: "easeInOut" }}
          className="absolute bottom-[18%] left-8 sm:left-12"
        >
          <p className="font-poppins text-4xl sm:text-5xl font-extrabold uppercase tracking-[0.25em] text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            {activeSlide.city}
          </p>
          <p className="text-sm sm:text-base font-medium uppercase tracking-[0.35em] text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            {activeSlide.country}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <nav className="absolute bottom-6 flex gap-3" aria-label="Carousel slide controls">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => goToSlide(idx)}
            className={`h-2 w-10 rounded-full transition-all ${
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
