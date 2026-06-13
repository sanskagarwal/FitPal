import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Target } from 'lucide-react';
import { useGoalsForm } from './goals/useGoalsForm';
import { AutoCalcPanel } from './goals/AutoCalcPanel';
import { MacroTargets } from './goals/MacroTargets';
import { MicronutrientTargets } from './goals/MicronutrientTargets';
import { GoalsTips } from './goals/GoalsTips';
import { GoalsSaveBar } from './goals/GoalsSaveBar';

export const Goals = () => {
  const { user } = useAuth();
  const { updateGoals } = usePreferences();
  const {
    formData,
    updateField,
    loading,
    isDirty,
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
    saveGoals,
    resetForm,
  } = useGoalsForm({ user, updateGoals });

  return (
    <div className="space-y-6 pb-28 md:pb-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Your Goals</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold">Set Your Nutrition & Fitness Goals</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Customize your daily targets to match your objectives</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AutoCalcPanel
            formData={formData}
            updateField={updateField}
            currentWeight={currentWeight}
            goalDirection={goalDirection}
            showRateSelector={showRateSelector}
            weeksToGoal={weeksToGoal}
            onCalculate={calculateCaloriesFromWeightLoss}
            gettingSuggestion={gettingSuggestion}
            aiExplanation={aiExplanation}
            onGetSuggestions={handleGetAISuggestions}
          />

          <MacroTargets formData={formData} updateField={updateField} />

          <MicronutrientTargets formData={formData} updateField={updateField} />

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') || message.includes('calculated') ? 'alert-success' : 'alert-error'
            }`}>
              {message}
            </div>
          )}

          {/* Submitting the form (Enter key) saves; the visible action lives in
              the sticky GoalsSaveBar so it is always reachable. */}
          <button type="submit" className="sr-only" aria-hidden="true" tabIndex={-1}>
            Update Goals
          </button>
        </form>
      </div>

      <GoalsTips />

      <GoalsSaveBar isDirty={isDirty} loading={loading} onSave={saveGoals} onReset={resetForm} />
    </div>
  );
};
