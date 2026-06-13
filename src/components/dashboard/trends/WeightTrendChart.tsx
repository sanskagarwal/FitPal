import { ReactNode } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingDown } from 'lucide-react';
import { useChartTheme } from '../useChartTheme';
import { useTheme } from '../../../context/ThemeContext';
import { WeightPoint } from './useTrendsData';

interface WeightTrendChartProps {
  chartData: WeightPoint[];
  targetWeight: number;
  headerRight?: ReactNode;
}

// Weight-over-time line chart with the target weight as a reference line.
// Shared by the dashboard trends section and the weight tracker page.
export const WeightTrendChart = ({ chartData, targetWeight, headerRight }: WeightTrendChartProps) => {
  const theme = useChartTheme();
  const { isDark: dark } = useTheme();

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Weight</h2>
        {headerRight}
      </div>
      {chartData.length === 0 ? (
        <div className="py-12 text-center">
          <TrendingDown className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No weigh-ins in this range. Log a weight to see your trend.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
            <YAxis
              domain={['auto', 'auto']}
              unit=" kg"
              width={48}
              tick={{ fontSize: 12, fill: theme.axis }}
              stroke={theme.axis}
            />
            <Tooltip
              contentStyle={theme.tooltip}
              itemStyle={{ color: theme.tooltip.color }}
              labelStyle={{ color: theme.tooltip.color }}
              formatter={(value) => [`${value} kg`, 'Weight']}
            />
            {targetWeight > 0 && (
              <ReferenceLine
                y={targetWeight}
                stroke="#f59e0b"
                strokeDasharray="6 4"
                label={{
                  value: `Target ${targetWeight} kg`,
                  position: 'insideTopRight',
                  fill: dark ? '#fbbf24' : '#b45309',
                  fontSize: 11,
                }}
              />
            )}
            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} name="Weight (kg)" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
