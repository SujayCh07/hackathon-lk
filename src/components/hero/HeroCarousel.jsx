import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';
import { useParallax } from '../../hooks/useParallax.js';
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
    opacity: 0.75,
    scale: 1.035
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? '-100%' : '100%',
    opacity: 0.75,
    scale: 1.02
  })
};

const captionVariants = {
  enter: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? 36 : -36,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction === 0 ? 0 : direction > 0 ? -36 : 36,
    opacity: 0
  })
};

export function HeroCarousel() {
  const [[index, direction], setSlideState] = useState([0, 0]);
  const { style: parallaxStyle } = useParallax(0.18);

  useEffect(() => {
    slides.forEach((slide) => {
      const preload = new Image();
      preload.src = slide.image;
    });
  }, []);

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
      <motion.div className="absolute inset-0" style={parallaxStyle}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={activeSlide.city}
            custom={direction}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: {
                duration: 1.05,
                ease: [0.22, 1, 0.36, 1]
              },
              opacity: {
                duration: 0.8,
                ease: 'easeInOut'
              },
              scale: {
                duration: 1.05,
                ease: [0.22, 1, 0.36, 1]
              }
            }}
            className="absolute inset-0"
          >
            <img
              src={activeSlide.image}
              alt={`${activeSlide.city} skyline`}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>
        <div
          className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-navy/50 via-transparent to-red/30"
          aria-hidden="true"
        />
      </motion.div>
      <div
        className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <motion.div
          key={`${activeSlide.city}-content`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative flex w-full max-w-4xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-charcoal/85 via-charcoal/75 to-charcoal/60 p-8 text-offwhite shadow-[0_32px_80px_-32px_rgba(0,40,120,0.65)] backdrop-blur-md sm:p-12"
        >
          <span className="rounded-full bg-white/10 px-5 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.4em] text-offwhite/85">
            Global PPP intelligence
          </span>
          <h1 className="font-poppins text-3xl font-semibold leading-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Same dollars, smarter world.
          </h1>
          <p className="max-w-2xl text-sm text-offwhite/85 sm:text-lg">
            See where your money goes the farthest with PPP-adjusted insights across the globe.
          </p>
          <Button
            as={Link}
            to="/dashboard"
            variant="primary"
            className="text-base shadow-lg shadow-navy/40 transition-all duration-300 hover:translate-y-[-2px] hover:bg-gradient-to-r hover:from-red hover:to-navy focus-visible:ring-4 focus-visible:ring-turquoise focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            aria-label="Connect my Capital One account and view dashboard"
          >
            Connect my Capital One Account
          </Button>
        </motion.div>
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
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-20 left-4 flex max-w-xs flex-col gap-1 rounded-2xl bg-charcoal/70 px-5 py-4 text-left text-white shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-lg sm:bottom-32 sm:left-12 sm:max-w-md"
          aria-live="polite"
        >
          <p className="font-poppins text-2xl font-semibold uppercase tracking-[0.2em] text-offwhite drop-shadow-lg sm:text-3xl">
            {activeSlide.city}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-offwhite/70 sm:text-sm">
            {activeSlide.country}
          </p>
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
