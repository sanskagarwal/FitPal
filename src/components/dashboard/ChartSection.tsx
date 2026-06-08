import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { DailyStats } from '../../types';
import { formatDayLabel } from '../../utils/helpers';

interface ChartSectionProps {
  todayStats: DailyStats | null;
  weeklyData: DailyStats[];
  isToday: boolean;
  selectedDate: Date;
}

export const MacroDistributionChart = ({ todayStats, isToday, selectedDate }: Pick<ChartSectionProps, 'todayStats' | 'isToday' | 'selectedDate'>) => {
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
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const WeeklyNutritionTrendsChart = ({ weeklyData }: Pick<ChartSectionProps, 'weeklyData'>) => {
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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis width={40} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="calories" stroke="#10b981" name="Calories" />
          <Line type="monotone" dataKey="protein" stroke="#ef4444" name="Protein (g)" />
          <Line type="monotone" dataKey="carbs" stroke="#3b82f6" name="Carbs (g)" />
          <Line type="monotone" dataKey="fats" stroke="#f59e0b" name="Fats (g)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
