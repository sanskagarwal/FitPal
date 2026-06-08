import { TrendingUp } from 'lucide-react';
import { GoalDirection } from '../../utils/goals';
import { GoalsFormData } from './useGoalsForm';

interface WeightGoalSectionProps {
  formData: GoalsFormData;
  updateField: (field: keyof GoalsFormData, value: number) => void;
  currentWeight: number | null;
  goalDirection: GoalDirection;
  showRateSelector: boolean;
  weeksToGoal: number | null;
  onCalculate: () => void;
}

export const WeightGoalSection = ({
  formData,
  updateField,
  currentWeight,
  goalDirection,
  showRateSelector,
  weeksToGoal,
  onCalculate,
}: WeightGoalSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Target Weight (kg)
        </label>
        <input
          type="number"
          step="0.1"
          min="20"
          max="500"
          value={formData.targetWeight}
          onChange={(e) => updateField('targetWeight', parseFloat(e.target.value))}
          className="input-field"
          required
        />
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          {currentWeight !== null && formData.targetWeight > 0
            ? goalDirection === 'loss'
              ? `Lose ${(currentWeight - formData.targetWeight).toFixed(1)} kg to reach your goal`
              : goalDirection === 'gain'
              ? `Gain ${(formData.targetWeight - currentWeight).toFixed(1)} kg to reach your goal`
              : 'Maintain your current weight'
            : 'Your desired weight goal'}
        </p>
      </div>

      {/* Rate selector only applies when actually losing or gaining weight. */}
      {showRateSelector && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            {goalDirection === 'gain' ? 'Weight Gain Rate (kg/week)' : 'Weight Loss Rate (kg/week)'}
          </label>
          <select
            value={formData.weightLossRate}
            onChange={(e) => updateField('weightLossRate', parseFloat(e.target.value))}
            className="input-field"
            aria-label="Weekly rate of weight change"
          >
            {goalDirection === 'gain' ? (
              <>
                <option value="0.25">0.25 kg/week (Lean & Steady)</option>
                <option value="0.5">0.5 kg/week (Moderate)</option>
                <option value="0.75">0.75 kg/week (Fast)</option>
              </>
            ) : (
              <>
                <option value="0.25">0.25 kg/week (Slow & Steady)</option>
                <option value="0.5">0.5 kg/week (Moderate)</option>
                <option value="0.75">0.75 kg/week (Aggressive)</option>
                <option value="1">1 kg/week (Very Aggressive)</option>
              </>
            )}
          </select>
          <button
            type="button"
            onClick={onCalculate}
            className="mt-2 text-sm btn-primary w-full"
          >
            {goalDirection === 'gain'
              ? 'Calculate Goals from Weight Gain Rate'
              : 'Calculate Goals from Weight Loss Rate'}
          </button>
          {weeksToGoal !== null && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
              At this rate, you'll reach your goal in about{' '}
              <span className="font-semibold">
                {weeksToGoal} {weeksToGoal === 1 ? 'week' : 'weeks'}
              </span>
              {weeksToGoal >= 4 && ` (~${Math.round(weeksToGoal / 4.345)} ${Math.round(weeksToGoal / 4.345) === 1 ? 'month' : 'months'})`}
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
};
