// src/components/hero/HeroCarousel.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// timing
const DURATION_MS = 1000;   // slide duration
const INTERVAL_MS = 4500;   // time between auto-advances

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(1); // 1 forward, -1 backward
  const animTimer = useRef(null);
  const autoTimer = useRef(null);

  // light parallax; if you still see jank, set factor to 0
  const { style: parallaxStyle } = useParallax(0.10);

  // Preload all once
  useEffect(() => {
    slides.forEach((s) => {
      const i = new Image();
      i.decoding = "async";
      i.src = s.image;
    });
  }, []);

  // Preload the upcoming slide right before anim starts
  const preloadNext = useCallback((idx) => {
    const i = new Image();
    i.decoding = "async";
    i.fetchPriority = "high";
    i.src = slides[idx].image;
  }, []);

  const startAnimation = useCallback((dir = 1, target = null) => {
    if (isAnimating) return; // debounce
    const total = slides.length;
    const nIdx = target !== null
      ? ((target % total) + total) % total
      : (index + dir + total) % total;

    preloadNext(nIdx);
    setDirection(dir);
    setNextIndex(nIdx);
    setIsAnimating(true);

    // Swap indexes after the slide finishes
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => {
      setIndex(nIdx);
      setIsAnimating(false);
    }, DURATION_MS);
  }, [index, isAnimating, preloadNext]);

  // Auto-advance
  useEffect(() => {
    clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => startAnimation(1), INTERVAL_MS);
    return () => clearInterval(autoTimer.current);
  }, [startAnimation]);

  const goToSlide = useCallback((targetIndex) => {
    const total = slides.length;
    const t = ((targetIndex % total) + total) % total;
    if (t === index || isAnimating) return;
    // choose shortest direction (basic heuristic)
    const dir = (t > index || (index === total - 1 && t === 0)) ? 1 : -1;
    startAnimation(dir, t);
  }, [index, isAnimating, startAnimation]);

  // current + next slides
  const current = slides[index];
  const upcoming = slides[nextIndex];

  // translate values for each layer (hardware-accelerated)
  const currentX = isAnimating ? (direction > 0 ? "-100%" : "100%") : "0%";
  const nextX    = isAnimating ? "0%" : (direction > 0 ? "100%" : "-100%");

  const ease = useMemo(() => "cubic-bezier(0.22,1,0.36,1)", []);

  return (
    <section
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-charcoal text-offwhite"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured destinations"
    >
      {/* === SLIDE TRACK: two persistent layers, no unmount/mount during anim === */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Current layer */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(${currentX},0,0)`,
            transition: isAnimating ? `transform ${DURATION_MS}ms ${ease}` : "none",
            ...parallaxStyle, // comment this out if you want *zero* parallax overhead
          }}
        >
          <img
            src={current.image}
            alt={`${current.city} skyline`}
            className="h-full w-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Next layer */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(${nextX},0,0)`,
            transition: isAnimating ? `transform ${DURATION_MS}ms ${ease}` : "none",
          }}
        >
          <img
            src={upcoming.image}
            alt={`${upcoming.city} skyline`}
            className="h-full w-full object-cover pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Readability overlays (cheap to composite) */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 via-charcoal/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/40 via-transparent to-red/25" />
      </div>

      {/* === CENTER CONTENT (static) === */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-xl bg-charcoal/55 px-6 py-8 text-center shadow-[0_20px_50px_rgba(6,16,40,0.4)] backdrop-blur-[2px]">
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
            className="text-base shadow-lg transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]
                       hover:translate-y-[-3px] hover:scale-[1.03] hover:bg-gradient-to-r hover:from-red hover:to-navy"
          >
            Connect my&nbsp;<span className="text-red-600">Capital One™</span>&nbsp;Account
          </Button>
        </div>
      </div>

      {/* === CAPTION (moves in lockstep with slide) === */}
      <div
        className="absolute bottom-[18%] left-8 sm:left-12 will-change-transform"
        style={{
          transform: `translate3d(${isAnimating ? (direction > 0 ? "-48px" : "48px") : "0px"}, 0, 0)`,
          opacity: isAnimating ? 0.0 : 1,
          transition: `transform ${DURATION_MS}ms ${ease}, opacity ${DURATION_MS}ms ${ease}`,
        }}
      >
        <p className="font-poppins text-4xl sm:text-5xl font-extrabold uppercase tracking-[0.25em] text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          {current.city}
        </p>
        <p className="text-sm sm:text-base font-medium uppercase tracking-[0.35em] text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
          {current.country}
        </p>
      </div>

      {/* === DOTS === */}
      <nav className="absolute bottom-6 flex gap-3" aria-label="Carousel slide controls">
        {slides.map((s, idx) => (
          <button
            key={s.city}
            type="button"
            onClick={() => goToSlide(idx)}
            className={`h-2 w-10 rounded-full transition-all ${
              idx === index ? "bg-offwhite" : "bg-white/40"
            }`}
            aria-label={`Show ${s.city}`}
          />
        ))}
      </nav>
    </section>
  );
}

export default HeroCarousel;
