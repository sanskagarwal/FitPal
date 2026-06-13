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
import { useChartTheme } from '../useChartTheme';
import { TrendDay } from './useTrendsData';

interface CalorieTrendChartProps {
  days: TrendDay[];
  targetCalories?: number;
}

// Daily calorie intake over the selected range, with the calorie goal drawn as
// a reference line.
export const CalorieTrendChart = ({ days, targetCalories }: CalorieTrendChartProps) => {
  const theme = useChartTheme();
  const data = days.map((day) => ({
    date: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: Math.round(day.calories),
  }));

  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold">Calories</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <YAxis width={44} tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <Tooltip
            contentStyle={theme.tooltip}
            itemStyle={{ color: theme.tooltip.color }}
            labelStyle={{ color: theme.tooltip.color }}
          />
          {targetCalories ? (
            <ReferenceLine
              y={targetCalories}
              stroke="#059669"
              strokeDasharray="4 4"
              label={{
                value: `Target ${targetCalories}`,
                fill: theme.axis,
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          ) : null}
          <Line type="monotone" dataKey="calories" stroke="#10b981" name="Calories" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
