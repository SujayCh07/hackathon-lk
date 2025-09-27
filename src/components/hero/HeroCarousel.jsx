import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';
import { useParallax } from '../../hooks/useParallax.js';

// City images
import Paris from '../../assets/cities/paris.jpg';
import Lisbon from '../../assets/cities/lisbon.jpg';
import MexicoCity from '../../assets/cities/mexicocity.jpg';
import Bangkok from '../../assets/cities/bangkok.jpg';
import NewYork from '../../assets/cities/newyork.jpg';
import London from '../../assets/cities/london.jpg';
import Tokyo from '../../assets/cities/tokyo.jpg';
import Dubai from '../../assets/cities/dubai.jpg';

const slides = [
  { city: 'Paris', country: 'France', image: Paris },
  { city: 'Lisbon', country: 'Portugal', image: Lisbon },
  { city: 'Mexico City', country: 'Mexico', image: MexicoCity },
  { city: 'Bangkok', country: 'Thailand', image: Bangkok },
  { city: 'New York', country: 'United States', image: NewYork },
  { city: 'London', country: 'United Kingdom', image: London },
  { city: 'Tokyo', country: 'Japan', image: Tokyo },
  { city: 'Dubai', country: 'United Arab Emirates', image: Dubai }
];

const imageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0.6,
    scale: 1.05
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0.6,
    scale: 1.02
  })
};

const captionVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0
  })
};

export function HeroCarousel() {
  const [[index, direction], setSlideState] = useState([0, 0]);
  const { style: parallaxStyle } = useParallax(0.18);

  const goToSlide = useCallback((targetIndex) => {
    setSlideState(([prevIndex]) => {
      const total = slides.length;
      const normalized = ((targetIndex % total) + total) % total;

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
      setSlideState(([prevIndex]) => [(prevIndex + 1) % slides.length, 1]);
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
      {/* Background image */}
      <motion.div className="absolute inset-0" style={parallaxStyle}>
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
              x: { duration: 0.9, ease: 'easeInOut' },
              opacity: { duration: 0.6, ease: 'easeInOut' },
              scale: { duration: 0.9, ease: 'easeOut' }
            }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/50 via-transparent to-red/30" />
      </motion.div>

      {/* Content */}
      <div
        className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6"
      >
        <motion.div
          key={`${activeSlide.city}-content`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative flex w-full max-w-4xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-8 text-offwhite shadow-lg sm:p-12"
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
          >
            Connect my Capital One Account
          </Button>
        </motion.div>
      </div>

      {/* Caption */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`${activeSlide.city}-caption`}
          custom={direction}
          variants={captionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute bottom-6 left-4 sm:bottom-12 sm:left-12"
        >
          <p className="font-poppins text-3xl sm:text-4xl font-bold uppercase tracking-[0.2em] leading-[1.3] text-white drop-shadow-lg">
            {activeSlide.city}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-sm">
            {activeSlide.country}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
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
          />
        ))}
      </nav>
    </section>
  );
}

export default HeroCarousel;
