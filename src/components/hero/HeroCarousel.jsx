import { useCallback, useEffect, useState } from 'react';
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

const imageVariants = {
  enter: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? '100%' : '-100%',
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? '-100%' : '100%',
    opacity: 0
  })
};

const captionVariants = {
  enter: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? 32 : -32,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? -32 : 32,
    opacity: 0
  })
};

export function HeroCarousel() {
  const [[index, direction], setSlideState] = useState([0, 0]);

  const goToSlide = useCallback((targetIndex) => {
    setSlideState(([prevIndex, prevDirection]) => {
      const total = slides.length;
      const normalized = ((targetIndex % total) + total) % total;

      if (normalized === prevIndex) {
        return [prevIndex, prevDirection];
      }

      let nextDirection;
      if (prevIndex === total - 1 && normalized === 0) {
        nextDirection = 1;
      } else if (prevIndex === 0 && normalized === total - 1) {
        nextDirection = -1;
      } else {
        nextDirection = normalized > prevIndex ? 1 : -1;
      }

      return [normalized, nextDirection];
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideState(([prevIndex]) => {
        const next = (prevIndex + 1) % slides.length;
        return [next, 1];
      });
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
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={activeSlide.city}
            src={activeSlide.image}
            alt={`${activeSlide.city} skyline`}
            className="h-full w-full object-cover"
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 120, damping: 30 },
              opacity: { duration: 0.4 }
            }}
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
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`${activeSlide.city}-caption`}
          custom={direction}
          variants={captionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute bottom-12 left-8 flex flex-col gap-1 text-left"
          aria-live="polite"
        >
          <p className="font-poppins text-3xl font-semibold uppercase tracking-[0.2em] text-offwhite drop-shadow-lg">
            {activeSlide.city}
          </p>
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-offwhite/70">{activeSlide.country}</p>
        </motion.div>
      </AnimatePresence>
      <nav className="absolute bottom-8 flex gap-3" aria-label="Carousel slide controls">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => goToSlide(idx)}
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
