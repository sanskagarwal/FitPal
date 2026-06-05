import { useState, useEffect } from 'react';
import { User, UserGoals } from '../../types';
import { suggestGoals } from '../../services/openai';
import { calculateAge } from '../../utils/helpers';
import { getWeightsByUser } from '../../utils/db';
import {
  calculateMacroGoalsFromRate,
  getGoalDirection,
  getWeeksToGoal,
  GoalDirection,
} from '../../utils/goals';

export type GoalsFormData = {
  targetWeight: number;
  weightLossRate: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  targetFiber: number;
  targetVitaminA: number;
  targetVitaminC: number;
  targetVitaminD: number;
  targetCalcium: number;
  targetIron: number;
  targetMagnesium: number;
  targetPotassium: number;
};

const buildInitialForm = (goals?: UserGoals): GoalsFormData => ({
  targetWeight: goals?.targetWeight || 0,
  weightLossRate: goals?.weightLossRate || 0.5,
  targetCalories: goals?.targetCalories || 2000,
  targetProtein: goals?.targetProtein || 150,
  targetCarbs: goals?.targetCarbs || 250,
  targetFats: goals?.targetFats || 65,
  targetFiber: goals?.targetFiber || 30,
  targetVitaminA: goals?.targetVitaminA || 900,
  targetVitaminC: goals?.targetVitaminC || 90,
  targetVitaminD: goals?.targetVitaminD || 15,
  targetCalcium: goals?.targetCalcium || 1000,
  targetIron: goals?.targetIron || 18,
  targetMagnesium: goals?.targetMagnesium || 400,
  targetPotassium: goals?.targetPotassium || 3500,
});

interface UseGoalsFormArgs {
  user: User | null;
  updateGoals: (goals: GoalsFormData) => Promise<void>;
}

// Owns the Goals form state and the AI/rate-based goal calculations. Wraps the
// existing db + AI calls only.
export const useGoalsForm = ({ user, updateGoals }: UseGoalsFormArgs) => {
  const [formData, setFormData] = useState<GoalsFormData>(buildInitialForm(user?.profile.goals));
  const [loading, setLoading] = useState(false);
  const [gettingSuggestion, setGettingSuggestion] = useState(false);
  const [message, setMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getWeightsByUser(user.id).then((weights) => {
      if (weights.length > 0) {
        setCurrentWeight(weights[0].weight);
      }
    });
  }, [user]);

  const updateField = (field: keyof GoalsFormData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGetAISuggestions = async () => {
    if (!user) return;

    if (currentWeight === null) {
      setMessage('Please log your current weight in the Weight Tracker first.');
      return;
    }

    setGettingSuggestion(true);
    setMessage('');
    setAiExplanation('');

    try {
      const suggestions = await suggestGoals(
        user.profile.height,
        currentWeight,
        calculateAge(user.profile.dateOfBirth),
        user.profile.gender,
        user.profile.activityLevel,
        formData.targetWeight
      );

      setFormData({
        ...formData,
        targetCalories: suggestions.calories,
        targetProtein: suggestions.protein,
        targetCarbs: suggestions.carbs,
        targetFats: suggestions.fats,
        targetFiber: suggestions.fiber,
      });
      setAiExplanation(suggestions.explanation);
      setMessage('AI suggestions loaded! Review and save if you like them.');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setMessage('Failed to get AI suggestions. Please try again.');
    } finally {
      setGettingSuggestion(false);
    }
  };

  const calculateCaloriesFromWeightLoss = () => {
    if (!user) return;

    if (currentWeight === null) {
      setMessage('Please log your current weight in the Weight Tracker first.');
      return;
    }

    const result = calculateMacroGoalsFromRate(
      user.profile,
      currentWeight,
      formData.targetWeight,
      formData.weightLossRate
    );

    setFormData({
      ...formData,
      targetCalories: result.targetCalories,
      targetProtein: result.targetProtein,
      targetCarbs: result.targetCarbs,
      targetFats: result.targetFats,
    });

    const label =
      result.direction === 'loss'
        ? `${formData.weightLossRate}kg/week weight loss`
        : result.direction === 'gain'
        ? `${formData.weightLossRate}kg/week weight gain`
        : 'weight maintenance';
    setMessage(`Goals calculated for ${label}!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateGoals(formData);
      setMessage('Goals updated successfully!');
    } catch (error) {
      console.error('Error updating goals:', error);
      setMessage('Error updating goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Which way the user is headed, based on target vs. current weight. Drives
  // the labels and whether we apply a deficit or a surplus.
  const goalDirection: GoalDirection =
    currentWeight !== null && formData.targetWeight > 0
      ? getGoalDirection(currentWeight, formData.targetWeight)
      : 'loss';

  // The weekly rate only makes sense when actually losing or gaining weight,
  // and once we know the current weight to compare against the target.
  const showRateSelector =
    currentWeight !== null && formData.targetWeight > 0 && goalDirection !== 'maintain';

  const weeksToGoal = showRateSelector
    ? getWeeksToGoal(currentWeight, formData.targetWeight, formData.weightLossRate, goalDirection)
    : null;

  return {
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
  };
};
