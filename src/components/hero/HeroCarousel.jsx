import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../ui/Button.jsx';
import { Link } from 'react-router-dom';

const slides = [
  {
    city: 'Atlanta',
    country: 'United States',
    image: new URL('../../assets/cities/atlanta.svg', import.meta.url).href
  },
  {
    city: 'Lisbon',
    country: 'Portugal',
    image: new URL('../../assets/cities/lisbon.svg', import.meta.url).href
  },
  {
    city: 'Mexico City',
    country: 'Mexico',
    image: new URL('../../assets/cities/mexico-city.svg', import.meta.url).href
  },
  {
    city: 'Bangkok',
    country: 'Thailand',
    image: new URL('../../assets/cities/bangkok.svg', import.meta.url).href
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
    <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/40 bg-charcoal/90 text-offwhite shadow-2xl shadow-teal/20">
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeSlide.city}
            src={activeSlide.image}
            alt={`${activeSlide.city} skyline`}
            className="h-full w-full object-cover opacity-90"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 1.1 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/50 to-charcoal/80" aria-hidden="true" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center md:max-w-2xl">
        <motion.span
          key={`${activeSlide.city}-label`}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="rounded-full bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.3em]"
        >
          {activeSlide.city}, {activeSlide.country}
        </motion.span>
        <h1 className="text-4xl font-poppins font-semibold tracking-tight text-offwhite sm:text-5xl">
          Same dollars, smarter world.
        </h1>
        <p className="max-w-xl text-base text-offwhite/80 sm:text-lg">
          See where your money goes the farthest with PPP-adjusted insights across the globe.
        </p>
        <Button as={Link} to="/dashboard" variant="primary" className="text-base">
          Explore your PPP dashboard
        </Button>
      </div>
      <div className="absolute bottom-8 flex gap-2">
        {slides.map((slide, idx) => (
          <button
            key={slide.city}
            type="button"
            onClick={() => setIndex(idx)}
            className={`h-2 w-8 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-offwhite ${
              idx === index ? 'bg-offwhite/90' : 'bg-white/30'
            }`}
            aria-label={`Show ${slide.city}`}
          />
        ))}
      </div>
    </section>
  );
}

export default HeroCarousel;
