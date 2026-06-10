import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface WeightChartProps {
  hasWeights: boolean;
  chartData: { date: string; weight: number; bmi: number }[];
  targetWeight: number;
}

export const WeightChart = ({ hasWeights, chartData, targetWeight }: WeightChartProps) => {
  const { isDark: dark } = useTheme();
  const grid = dark ? '#374151' : '#e5e7eb';
  const axis = dark ? '#9ca3af' : '#6b7280';
  const tooltipStyle = dark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f3f4f6' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, color: '#111827' };

  if (!hasWeights) {
    return (
      <div className="card text-center py-12">
        <TrendingDown className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">No weigh-ins yet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Log your first weight above to start tracking your progress.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Weight Progress</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: axis }} stroke={axis} />
          <YAxis domain={['auto', 'auto']} unit=" kg" width={48} tick={{ fontSize: 12, fill: axis }} stroke={axis} />
          <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: tooltipStyle.color }} labelStyle={{ color: tooltipStyle.color }} formatter={(value) => [`${value} kg`, 'Weight']} />
          {targetWeight > 0 && (
            <ReferenceLine
              y={targetWeight}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              label={{ value: `Target ${targetWeight} kg`, position: 'insideTopRight', fill: dark ? '#fbbf24' : '#b45309', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#10b981"
            strokeWidth={2}
            name="Weight (kg)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
