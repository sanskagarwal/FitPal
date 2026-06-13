import { TrendingDown, TrendingUp, Minus, Award, Calendar } from 'lucide-react';
import { WeightEntry, Streak } from '../../types';

interface WeightKpiGridProps {
  // 'full' shows three stat cards (current with change, target with progress,
  // streak) for the weight page; 'compact' shows a four-up KPI row for the
  // dashboard trends section.
  variant: 'full' | 'compact';
  latestWeight: WeightEntry | null | undefined;
  targetWeight: number;
  weightChange?: number | null;
  goalProgress?: number | null;
  streak?: Streak | null;
}

// Shared weight KPI summary, replacing the previous WeightStats (weight page)
// and WeightProgress (dashboard) so the two stay in sync.
export const WeightKpiGrid = ({
  variant,
  latestWeight,
  targetWeight,
  weightChange,
  goalProgress,
  streak,
}: WeightKpiGridProps) => {
  if (variant === 'compact') {
    if (!latestWeight) return null;
    return (
      <div className="card">
        <h2 className="mb-4 text-xl font-semibold">Current progress</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Current Weight</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {latestWeight.weight} kg
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Target Weight</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{targetWeight} kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">BMI</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{latestWeight.bmi}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">To Go</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {Math.abs(latestWeight.weight - targetWeight).toFixed(1)} kg
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Current Weight</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {latestWeight ? `${latestWeight.weight} kg` : 'N/A'}
            </p>
            {latestWeight && (
              <p className="text-sm text-gray-600 dark:text-gray-300">BMI: {latestWeight.bmi}</p>
            )}
            {weightChange !== null && weightChange !== undefined && (
              <p
                className={`mt-1 flex items-center gap-1 text-sm font-medium ${
                  weightChange < 0
                    ? 'text-green-600 dark:text-green-400'
                    : weightChange > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {weightChange < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : weightChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                {weightChange > 0 ? '+' : ''}
                {weightChange} kg since last
              </p>
            )}
          </div>
          <TrendingDown className="h-12 w-12 text-primary-600" />
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Target Weight</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{targetWeight} kg</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {latestWeight ? `${Math.abs(latestWeight.weight - targetWeight).toFixed(1)} kg to go` : ''}
            </p>
            {goalProgress !== null && goalProgress !== undefined && (
              <div className="mt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(goalProgress)}% to goal
                </p>
              </div>
            )}
          </div>
          <Award className="h-12 w-12 text-amber-500" />
        </div>
      </div>

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary-700 dark:text-primary-300">Current Streak</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {streak?.currentStreak || 0} days
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Longest: {streak?.longestStreak || 0} days
            </p>
          </div>
          <Calendar className="h-12 w-12 text-primary-600" />
        </div>
      </div>
    </div>
  );
};
