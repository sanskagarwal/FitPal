import { TrendingUp, Sparkles, Calculator } from 'lucide-react';
import { GoalDirection } from '../../utils/goals';
import { GoalsFormData } from './useGoalsForm';
import { Spinner, LoadingBlock } from '../Spinner';

interface AutoCalcPanelProps {
  formData: GoalsFormData;
  updateField: (field: keyof GoalsFormData, value: number) => void;
  currentWeight: number | null;
  goalDirection: GoalDirection;
  showRateSelector: boolean;
  weeksToGoal: number | null;
  onCalculate: () => void;
  gettingSuggestion: boolean;
  aiExplanation: string;
  onGetSuggestions: () => void;
}

// Unified "set targets automatically" panel: the weight goal inputs and both
// auto-fill actions (calculate from rate, AI suggestion) in one place, so they
// feel like one workflow that fills the editable targets below.
export const AutoCalcPanel = ({
  formData,
  updateField,
  currentWeight,
  goalDirection,
  showRateSelector,
  weeksToGoal,
  onCalculate,
  gettingSuggestion,
  aiExplanation,
  onGetSuggestions,
}: AutoCalcPanelProps) => {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-4 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Set targets automatically</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Fill the targets below from your weight goal or with an AI suggestion, then fine-tune.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-primary-50 p-4 dark:bg-primary-900/30">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <TrendingUp className="h-4 w-4" />
            Target Weight (kg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="500"
            value={formData.targetWeight}
            onChange={(e) => updateField('targetWeight', parseFloat(e.target.value))}
            className="input-field"
            required
          />
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
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
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/30">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
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
            {weeksToGoal !== null && (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                At this rate, you'll reach your goal in about{' '}
                <span className="font-semibold">
                  {weeksToGoal} {weeksToGoal === 1 ? 'week' : 'weeks'}
                </span>
                {weeksToGoal >= 4 &&
                  ` (~${Math.round(weeksToGoal / 4.345)} ${
                    Math.round(weeksToGoal / 4.345) === 1 ? 'month' : 'months'
                  })`}
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCalculate}
          className="btn-secondary flex flex-1 items-center justify-center gap-2"
        >
          <Calculator className="h-4 w-4" />
          {goalDirection === 'gain' ? 'Calculate from gain rate' : 'Calculate from loss rate'}
        </button>
        <button
          type="button"
          onClick={onGetSuggestions}
          disabled={gettingSuggestion}
          className="btn-primary flex flex-1 items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {gettingSuggestion ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {gettingSuggestion ? 'Getting suggestion...' : 'Get AI suggestion'}
        </button>
      </div>

      {gettingSuggestion ? (
        <div className="mt-3 rounded bg-white p-3 dark:bg-gray-800">
          <LoadingBlock label="Crunching your profile and target to recommend goals..." />
        </div>
      ) : aiExplanation ? (
        <div className="mt-3 whitespace-pre-line rounded bg-white p-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          {aiExplanation}
        </div>
      ) : null}
    </section>
  );
};
