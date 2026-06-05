import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Target } from 'lucide-react';
import { useGoalsForm } from './goals/useGoalsForm';
import { WeightGoalSection } from './goals/WeightGoalSection';
import { AIGoalSuggestion } from './goals/AIGoalSuggestion';
import { MacroTargets } from './goals/MacroTargets';
import { MicronutrientTargets } from './goals/MicronutrientTargets';
import { GoalsTips } from './goals/GoalsTips';

export const Goals = () => {
  const { user } = useAuth();
  const { updateGoals } = usePreferences();
  const {
    formData,
    updateField,
    loading,
    gettingSuggestion,
    message,
    aiExplanation,
    currentWeight,
    goalDirection,
    showRateSelector,
    weeksToGoal,
    handleGetAISuggestions,
    calculateCaloriesFromWeightLoss,
    handleSubmit,
  } = useGoalsForm({ user, updateGoals });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Goals</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold">Set Your Nutrition & Fitness Goals</h2>
            <p className="text-sm text-gray-600">Customize your daily targets to match your objectives</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <WeightGoalSection
            formData={formData}
            updateField={updateField}
            currentWeight={currentWeight}
            goalDirection={goalDirection}
            showRateSelector={showRateSelector}
            weeksToGoal={weeksToGoal}
            onCalculate={calculateCaloriesFromWeightLoss}
          />

          <AIGoalSuggestion
            gettingSuggestion={gettingSuggestion}
            aiExplanation={aiExplanation}
            onGetSuggestions={handleGetAISuggestions}
          />

          <MacroTargets formData={formData} updateField={updateField} />

          <MicronutrientTargets formData={formData} updateField={updateField} />

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') || message.includes('calculated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Updating...' : 'Update Goals'}
          </button>
        </form>
      </div>

      <GoalsTips />
    </div>
  );
};
