import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { DailyStats, UserGoals } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface ChartSectionProps {
  weeklyData: DailyStats[];
  goals?: UserGoals;
}

// Theme-aware colors for Recharts surfaces, which render via SVG/inline styles
// and can't use Tailwind `dark:` utilities.
const useChartTheme = () => {
  const { isDark: dark } = useTheme();
  return {
    grid: dark ? '#374151' : '#e5e7eb',
    axis: dark ? '#9ca3af' : '#6b7280',
    tooltip: dark
      ? { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }
      : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' },
  };
};

export const WeeklyNutritionTrendsChart = ({ weeklyData, goals }: ChartSectionProps) => {
  const theme = useChartTheme();
  const target = goals?.targetCalories;
  const weeklyChartData = weeklyData.map((day) => ({
    date: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
    calories: Math.round(day.totalCalories),
  }));

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Weekly Calorie Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weeklyChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <YAxis width={40} tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} labelStyle={{ color: theme.tooltip.color }} />
          {target ? (
            <ReferenceLine
              y={target}
              stroke="#059669"
              strokeDasharray="4 4"
              label={{ value: `Target ${target}`, fill: theme.axis, fontSize: 11, position: 'insideTopRight' }}
            />
          ) : null}
          <Line type="monotone" dataKey="calories" stroke="#10b981" name="Calories" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
