import { useEffect, useMemo, useRef, useState } from 'react';

const EPSILON = 0.5;

export function useParallax(multiplier = 0.3) {
  const [offset, setOffset] = useState(0);
  const multiplierRef = useRef(multiplier);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    let frameId = null;

    const updateOffset = () => {
      frameId = null;
      const next = window.scrollY * multiplierRef.current;
      setOffset((previous) => (Math.abs(previous - next) < EPSILON ? previous : next));
    };

    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateOffset);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  const style = useMemo(
    () => ({
      transform: `translate3d(0, ${-offset}px, 0)`
    }),
    [offset]
  );

  return { offset, style };
}
