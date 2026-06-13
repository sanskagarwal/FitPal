import { useTheme } from '../../context/ThemeContext';

// Theme-aware colors for Recharts surfaces, which render via SVG/inline styles
// and can't use Tailwind `dark:` utilities. Shared by every chart so the
// light/dark palette lives in one place.
export const useChartTheme = () => {
  const { isDark: dark } = useTheme();
  return {
    grid: dark ? '#374151' : '#e5e7eb',
    axis: dark ? '#9ca3af' : '#6b7280',
    tooltip: dark
      ? { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }
      : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' },
  };
};
