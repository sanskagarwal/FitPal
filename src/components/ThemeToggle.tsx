import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme, Theme } from '../context/ThemeContext';

const OPTIONS: { value: Theme; label: string; icon: typeof Monitor }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

interface ThemeToggleProps {
  /** Show text labels next to icons. Defaults to icon-only (compact header use). */
  showLabels?: boolean;
}

// Three-state segmented control for choosing the theme: System (follow OS),
// Light, or Dark. Implemented as a radiogroup for accessibility.
export const ThemeToggle = ({ showLabels = false }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
              selected
                ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-900 dark:text-primary-300'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {showLabels && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
};
