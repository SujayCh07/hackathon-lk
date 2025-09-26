import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';

const slides = [
  {
    city: 'Paris',
    country: 'France',
    image:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'Mexico City',
    country: 'Mexico',
    image:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'Bangkok',
    country: 'Thailand',
    image:
      'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'New York',
    country: 'United States',
    image:
      'https://images.unsplash.com/photo-1526402464715-78f0ce5c0f0c?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'London',
    country: 'United Kingdom',
    image:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    image:
      'https://images.unsplash.com/photo-1505060895512-9677c03c0f06?auto=format&fit=crop&w=1600&q=80'
  },
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    image:
      'https://images.unsplash.com/photo-1526481280695-3c46901f3f50?auto=format&fit=crop&w=1600&q=80'
  }
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
    }, 5000);
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
        <div
          className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy/50 via-transparent to-red/30"
          aria-hidden="true"
        />
      </div>
      <div
        className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        <motion.div
          key={`${activeSlide.city}-eyebrow`}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.4em] text-offwhite/80"
        >
          Global PPP intelligence
        </motion.div>
        <h1 className="font-poppins text-4xl font-semibold tracking-tight text-offwhite drop-shadow-lg sm:text-6xl">
          Same dollars, smarter world.
        </h1>
        <p className="max-w-3xl text-base text-offwhite/80 sm:text-xl">
          See where your money goes the farthest with PPP-adjusted insights across the globe.
        </p>
        <Button
          as={Link}
          to="/dashboard"
          variant="primary"
          className="text-base"
          aria-label="Connect my Capital One account and view dashboard"
        >
          Connect my Capital One Account
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-charcoal/70 to-transparent" aria-hidden="true" />
      <motion.div
        key={`${activeSlide.city}-caption`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute bottom-12 left-8 flex flex-col gap-1 text-left"
        aria-live="polite"
      >
        <p className="font-poppins text-3xl font-semibold uppercase tracking-[0.2em] text-offwhite drop-shadow-lg">
          {activeSlide.city}
        </p>
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-offwhite/70">{activeSlide.country}</p>
      </motion.div>
      <nav className="absolute bottom-8 flex gap-3" aria-label="Carousel slide controls">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => setIndex(idx)}
            className={`h-2 w-10 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offwhite ${
              idx === index ? 'bg-offwhite' : 'bg-white/40'
            }`}
            aria-label={`Show ${slide.city}`}
            aria-current={idx === index ? 'true' : undefined}
            aria-pressed={idx === index}
          />
        ))}
      </nav>
    </section>
  );
}

export default HeroCarousel;
