import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';

const slides = [
  { city: 'Paris', country: 'France', image: '/cities/paris.jpg' },
  { city: 'Lisbon', country: 'Portugal', image: '/cities/lisbon.jpg' },
  { city: 'Mexico City', country: 'Mexico', image: '/cities/mexico.jpg' },
  { city: 'Bangkok', country: 'Thailand', image: '/cities/bangkok.jpg' },
  { city: 'New York', country: 'United States', image: '/cities/newyork.jpg' },
  { city: 'London', country: 'United Kingdom', image: '/cities/london.jpg' },
  { city: 'Tokyo', country: 'Japan', image: '/cities/tokyo.jpg' },
  { city: 'Dubai', country: 'United Arab Emirates', image: '/cities/dubai.jpg' }
];

const variants = {
  initial: { opacity: 0, scale: 1.02 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const activeSlide = slides[index];

  return (
    <section
      className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured destinations"
    >
      {/* Background Images */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide.city}
            src={activeSlide.image}
            alt={`${activeSlide.city} skyline`}
            className="h-full w-full object-cover"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 1.1 }}
          />
        </AnimatePresence>
        {/* Gradient Overlays (Capital One branding) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#002878]/85 via-[#002878]/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#002878]/40 via-transparent to-[#D0312D]/40" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.div
          key={`${activeSlide.city}-eyebrow`}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.4em] text-white/80"
        >
          Global PPP Intelligence
        </motion.div>
        <h1 className="font-poppins text-4xl font-semibold tracking-tight text-white drop-shadow-lg sm:text-6xl">
          Same dollars, smarter world.
        </h1>
        <p className="max-w-3xl text-base text-white/80 sm:text-xl">
          See where your money goes the farthest with PPP-adjusted insights across the globe.
        </p>
        <Button
          as={Link}
          to="/dashboard"
          variant="primary"
          className="bg-[#D0312D] hover:bg-gradient-to-r hover:from-[#D0312D] hover:to-[#002878] px-6 py-3 rounded-lg text-white text-base"
        >
          Connect my Capital One Account
        </Button>
      </div>

      {/* City + Country Label */}
      <motion.div
        key={`${activeSlide.city}-caption`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute bottom-12 left-8 flex flex-col gap-1 text-left"
      >
        <p className="font-poppins text-3xl font-semibold uppercase tracking-[0.2em] text-white drop-shadow-lg">
          {activeSlide.city}
        </p>
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/70">
          {activeSlide.country}
        </p>
      </motion.div>

      {/* Controls */}
      <nav className="absolute bottom-6 flex gap-3" aria-label="Carousel controls">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => setIndex(idx)}
            className={`h-2 w-10 rounded-full transition-all ${
              idx === index ? 'bg-white' : 'bg-white/40'
            }`}
            aria-label={`Show ${slide.city}`}
            aria-current={idx === index ? 'true' : undefined}
          />
        ))}
      </nav>
    </section>
  );
}

export default HeroCarousel;
