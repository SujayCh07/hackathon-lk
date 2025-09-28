import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 }
};

export function RouteTransitions({ children, transitionKey }) {
  const effectiveKey = transitionKey ?? 'route-transition';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [effectiveKey]);

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={effectiveKey}
        role="main"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-offwhite via-white to-offwhite"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

export default RouteTransitions;
