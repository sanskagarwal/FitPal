import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { UserGoals } from '../../../types';
import { useChartTheme } from '../useChartTheme';
import { TrendDay } from './useTrendsData';

interface MacroTrendChartProps {
  days: TrendDay[];
  goals?: UserGoals;
}

const PROTEIN = '#3b82f6';
const CARBS = '#f59e0b';
const FATS = '#ef4444';

// Daily protein/carbs/fats over the selected range as three lines, each with a
// dashed reference line at its target.
export const MacroTrendChart = ({ days, goals }: MacroTrendChartProps) => {
  const theme = useChartTheme();
  const data = days.map((day) => ({
    date: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    protein: Math.round(day.protein),
    carbs: Math.round(day.carbs),
    fats: Math.round(day.fats),
  }));

  return (
    <div className="card">
      <h2 className="mb-4 text-xl font-semibold">Macros</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <YAxis width={44} unit=" g" tick={{ fontSize: 12, fill: theme.axis }} stroke={theme.axis} />
          <Tooltip
            contentStyle={theme.tooltip}
            itemStyle={{ color: theme.tooltip.color }}
            labelStyle={{ color: theme.tooltip.color }}
            formatter={(value, name) => [`${value} g`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: theme.axis }} />
          {goals?.targetProtein ? (
            <ReferenceLine y={goals.targetProtein} stroke={PROTEIN} strokeDasharray="4 4" strokeOpacity={0.5} />
          ) : null}
          {goals?.targetCarbs ? (
            <ReferenceLine y={goals.targetCarbs} stroke={CARBS} strokeDasharray="4 4" strokeOpacity={0.5} />
          ) : null}
          {goals?.targetFats ? (
            <ReferenceLine y={goals.targetFats} stroke={FATS} strokeDasharray="4 4" strokeOpacity={0.5} />
          ) : null}
          <Line type="monotone" dataKey="protein" stroke={PROTEIN} name="Protein" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="carbs" stroke={CARBS} name="Carbs" strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="fats" stroke={FATS} name="Fats" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
