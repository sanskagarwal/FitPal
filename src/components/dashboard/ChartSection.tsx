import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { DailyStats } from '../../types';
import { formatDayLabel } from '../../utils/helpers';
import { usePrefersDark } from '../../utils/usePrefersDark';

interface ChartSectionProps {
  todayStats: DailyStats | null;
  weeklyData: DailyStats[];
  isToday: boolean;
  selectedDate: Date;
}

// Theme-aware colors for Recharts surfaces, which render via SVG/inline styles
// and can't use Tailwind `dark:` utilities.
const useChartTheme = () => {
  const dark = usePrefersDark();
  return {
    grid: dark ? '#374151' : '#e5e7eb',
    axis: dark ? '#9ca3af' : '#6b7280',
    tooltip: dark
      ? { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }
      : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' },
  };
};

export const MacroDistributionChart = ({ todayStats, isToday, selectedDate }: Pick<ChartSectionProps, 'todayStats' | 'isToday' | 'selectedDate'>) => {
  const theme = useChartTheme();
  const macroData = [
    { name: 'Protein', value: todayStats?.totalProtein || 0, fill: '#ef4444' },
    { name: 'Carbs', value: todayStats?.totalCarbs || 0, fill: '#3b82f6' },
    { name: 'Fats', value: todayStats?.totalFats || 0, fill: '#f59e0b' },
  ];

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">{isToday ? "Today's" : `${formatDayLabel(selectedDate)}'s`} Macro Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={macroData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius="70%"
            fill="#8884d8"
            dataKey="value"
          />
          <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeeklyNutritionTrendsChart = ({ weeklyData }: Pick<ChartSectionProps, 'weeklyData'>) => {
  const theme = useChartTheme();
  const weeklyChartData = weeklyData.map((day) => ({
    date: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
    calories: day.totalCalories,
    protein: day.totalProtein,
    carbs: day.totalCarbs,
    fats: day.totalFats,
  }));

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Weekly Nutrition Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={weeklyChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <YAxis width={40} tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} labelStyle={{ color: theme.tooltip.color }} />
          <Legend wrapperStyle={{ fontSize: 12, color: theme.tooltip.color }} />
          <Line type="monotone" dataKey="calories" stroke="#10b981" name="Calories" />
          <Line type="monotone" dataKey="protein" stroke="#ef4444" name="Protein (g)" />
          <Line type="monotone" dataKey="carbs" stroke="#3b82f6" name="Carbs (g)" />
          <Line type="monotone" dataKey="fats" stroke="#f59e0b" name="Fats (g)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
