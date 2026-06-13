import { useEffect, useState } from 'react';

type ScrollDirection = 'up' | 'down';

/**
 * Tracks the vertical scroll direction of the window. Used to hide the mobile
 * bottom navigation when the user scrolls down (maximizing content space) and
 * reveal it again when they scroll up or return near the top.
 *
 * @param threshold Minimum scroll delta (px) before a direction change is
 *   registered, to avoid jitter on small movements.
 */
export const useScrollDirection = (threshold = 8): ScrollDirection => {
  const [direction, setDirection] = useState<ScrollDirection>('up');

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const update = () => {
      const scrollY = window.scrollY;

      // Always show the nav when near the top of the page.
      if (scrollY < 64) {
        setDirection('up');
        lastScrollY = scrollY;
        ticking = false;
        return;
      }

      if (Math.abs(scrollY - lastScrollY) >= threshold) {
        setDirection(scrollY > lastScrollY ? 'down' : 'up');
        lastScrollY = scrollY;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return direction;
};
