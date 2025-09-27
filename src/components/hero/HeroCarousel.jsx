import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';
import Paris from '../../assets/cities/paris.svg';
import Lisbon from '../../assets/cities/lisbon.svg';
import MexicoCity from '../../assets/cities/mexico-city.svg';
import Bangkok from '../../assets/cities/bangkok.svg';
import NewYork from '../../assets/cities/new-york.svg';
import London from '../../assets/cities/london.svg';
import Tokyo from '../../assets/cities/tokyo.svg';
import Dubai from '../../assets/cities/dubai.svg';

const slides = [
  {
    city: 'Paris',
    country: 'France',
    image: Paris
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    image: Lisbon
  },
  {
    city: 'Mexico City',
    country: 'Mexico',
    image: MexicoCity
  },
  {
    city: 'Bangkok',
    country: 'Thailand',
    image: Bangkok
  },
  {
    city: 'New York',
    country: 'United States',
    image: NewYork
  },
  {
    city: 'London',
    country: 'United Kingdom',
    image: London
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    image: Tokyo
  },
  {
    city: 'Dubai',
    country: 'United Arab Emirates',
    image: Dubai
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
