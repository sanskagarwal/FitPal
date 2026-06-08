import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown } from 'lucide-react';

interface WeightChartProps {
  hasWeights: boolean;
  chartData: { date: string; weight: number; bmi: number }[];
  targetWeight: number;
}

export const WeightChart = ({ hasWeights, chartData, targetWeight }: WeightChartProps) => {
  if (!hasWeights) {
    return (
      <div className="card text-center py-12">
        <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">No weigh-ins yet</h2>
        <p className="text-sm text-gray-500">Log your first weight above to start tracking your progress.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Weight Progress</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={['auto', 'auto']} unit=" kg" width={48} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
          {targetWeight > 0 && (
            <ReferenceLine
              y={targetWeight}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              label={{ value: `Target ${targetWeight} kg`, position: 'insideTopRight', fill: '#b45309', fontSize: 11 }}
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
