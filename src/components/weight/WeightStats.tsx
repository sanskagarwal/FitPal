import { TrendingDown, TrendingUp, Minus, Award, Calendar } from 'lucide-react';
import { WeightEntry, Streak } from '../../types';

interface WeightStatsProps {
  latestWeight: WeightEntry | undefined;
  weightChange: number | null;
  targetWeight: number;
  goalProgress: number | null;
  streak: Streak | null;
}

export const WeightStats = ({ latestWeight, weightChange, targetWeight, goalProgress, streak }: WeightStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700 font-medium">Current Weight</p>
            <p className="text-3xl font-bold text-gray-900">
              {latestWeight ? `${latestWeight.weight} kg` : 'N/A'}
            </p>
            {latestWeight && (
              <p className="text-sm text-gray-600">BMI: {latestWeight.bmi}</p>
            )}
            {weightChange !== null && (
              <p
                className={`text-sm font-medium flex items-center gap-1 mt-1 ${
                  weightChange < 0
                    ? 'text-green-600'
                    : weightChange > 0
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {weightChange < 0 ? (
                  <TrendingDown className="w-4 h-4" />
                ) : weightChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                {weightChange > 0 ? '+' : ''}
                {weightChange} kg since last
              </p>
            )}
          </div>
          <TrendingDown className="w-12 h-12 text-primary-600" />
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700 font-medium">Target Weight</p>
            <p className="text-3xl font-bold text-gray-900">{targetWeight} kg</p>
            <p className="text-sm text-gray-600">
              {latestWeight ? `${Math.abs(latestWeight.weight - targetWeight).toFixed(1)} kg to go` : ''}
            </p>
            {goalProgress !== null && (
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{Math.round(goalProgress)}% to goal</p>
              </div>
            )}
          </div>
          <Award className="w-12 h-12 text-amber-500" />
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-700 font-medium">Current Streak</p>
            <p className="text-3xl font-bold text-gray-900">{streak?.currentStreak || 0} days</p>
            <p className="text-sm text-gray-600">Longest: {streak?.longestStreak || 0} days</p>
          </div>
          <Calendar className="w-12 h-12 text-primary-600" />
        </div>
      </div>
    </div>
  );
};
