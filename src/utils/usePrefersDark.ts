import { useEffect, useState } from 'react';

/**
 * Tracks the OS-level `prefers-color-scheme: dark` setting and live-updates when
 * it changes. Used to pick theme-aware colors for non-CSS surfaces (e.g. Recharts
 * axes/grids/tooltips) that can't rely on Tailwind `dark:` utilities.
 */
export const usePrefersDark = (): boolean => {
  const getMatch = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const [prefersDark, setPrefersDark] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersDark;
};
