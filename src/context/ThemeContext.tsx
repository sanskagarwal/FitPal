import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Device/UI theme preference. Kept separate from PreferencesContext (which is
// per-account profile/goals data and requires a logged-in user) so the theme
// applies instantly and works on the auth page before login.
export type Theme = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'fitpal-theme';

// Light/dark values for the browser UI (address bar, etc.). Must match the
// background colors used by the app shell in light/dark modes.
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#10b981',
  dark: '#111827',
};

interface ThemeContextType {
  /** The user's chosen theme: follows the OS, or an explicit override. */
  theme: Theme;
  /** Update the chosen theme. Persisted to localStorage. */
  setTheme: (theme: Theme) => void;
  /** The effective theme after resolving `system` against the OS setting. */
  resolvedTheme: ResolvedTheme;
  /** Convenience flag, true when the resolved theme is dark. */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const prefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const readStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  // Tracks the OS color scheme so `system` mode can resolve and live-update.
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark);

  // Derived during render to avoid setState-in-effect cascades.
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Keep the OS scheme in sync; only matters while following the system.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Apply the resolved theme to the document and browser chrome.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[resolvedTheme]);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, isDark: resolvedTheme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
