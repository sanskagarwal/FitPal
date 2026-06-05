import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectedDate } from '../context/DateContext';
import { DateNavigator } from './DateNavigator';
import { NutrientInfo, DietPreference, MealSuggestion, NutrientSuggestion, DietaryInsight } from '../types';
import {
  suggestMeal,
  suggestFoodForNutrient,
  getDietaryInsights,
} from '../services/openai';
import { useDashboardData } from './dashboard/useDashboardData';
import { MotivationalBanner } from './dashboard/MotivationalBanner';
import { OverviewStats } from './dashboard/OverviewStats';
import { MealSuggestionPanel } from './dashboard/MealSuggestionPanel';
import { InsightPanel } from './dashboard/InsightPanel';
import { MealBreakdownTable } from './dashboard/MealBreakdownTable';
import { MicronutrientsPanel } from './dashboard/MicronutrientsPanel';
import { NutrientSuggestionPanel } from './dashboard/NutrientSuggestionPanel';
import { WeightProgress } from './dashboard/WeightProgress';
import { MacroDistributionChart, WeeklyNutritionTrendsChart } from './dashboard/ChartSection';

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const { loading, todayStats, weeklyData, recentWeight, mealTypeStats, micronutrients } =
    useDashboardData(user, selectedDate);

  const [mealSuggestion, setMealSuggestion] = useState<MealSuggestion | null>(null);
  const [suggestingMeal, setSuggestingMeal] = useState(false);
  const [nutrientSuggestion, setNutrientSuggestion] = useState<NutrientSuggestion | null>(null);
  const [suggestingNutrient, setSuggestingNutrient] = useState(false);
  const [insight, setInsight] = useState<DietaryInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [dietPreference, setDietPreference] = useState<DietPreference>(
    user?.profile.dietPreference || DietPreference.Vegetarian
  );

  // Re-sync the diet preference when the signed-in user's preference changes
  // (e.g. after re-login), so meal suggestions don't use a previous user's
  // value. React's recommended "adjust state during render" pattern.
  const [prevDietPreference, setPrevDietPreference] = useState(user?.profile.dietPreference);
  if (user?.profile.dietPreference !== prevDietPreference) {
    setPrevDietPreference(user?.profile.dietPreference);
    setDietPreference(user?.profile.dietPreference || DietPreference.Vegetarian);
  }

  const handleMealSuggestion = async () => {
    if (!user || !todayStats) return;

    setSuggestingMeal(true);
    setMealSuggestion(null);

    const goals = user.profile.goals;
    const remainingCalories = goals.targetCalories - todayStats.totalCalories;
    const remainingProtein = goals.targetProtein - todayStats.totalProtein;
    const remainingCarbs = goals.targetCarbs - todayStats.totalCarbs;
    const remainingFats = goals.targetFats - todayStats.totalFats;
    const remainingFiber = (goals.targetFiber || 30) - (micronutrients.fiber || 0);

    // Determine which meal type to suggest
    const currentHour = new Date().getHours();
    let mealType = 'dinner';
    if (currentHour < 10) mealType = 'breakfast';
    else if (currentHour < 12) mealType = 'morning snack';
    else if (currentHour < 15) mealType = 'lunch';
    else if (currentHour < 18) mealType = 'evening snack';

    try {
      const suggestion = await suggestMeal(
        Math.round(remainingCalories),
        Math.round(remainingProtein),
        Math.round(remainingCarbs),
        Math.round(remainingFats),
        Math.round(remainingFiber),
        mealType,
        dietPreference
      );
      setMealSuggestion(suggestion);
    } catch (error) {
      console.error('Error getting meal suggestion:', error);
    } finally {
      setSuggestingMeal(false);
    }
  };

  const handleNutrientSuggestion = async (nutrientName: string, currentAmount: number, targetAmount: number) => {
    if (!user) return;

    setSuggestingNutrient(true);
    setNutrientSuggestion(null);

    try {
      const suggestion = await suggestFoodForNutrient(nutrientName, currentAmount, targetAmount);
      setNutrientSuggestion(suggestion);
    } catch (error) {
      console.error('Error getting nutrient suggestion:', error);
    } finally {
      setSuggestingNutrient(false);
    }
  };

  const handleGetInsights = async () => {
    if (!user || !todayStats) return;

    setLoadingInsight(true);
    setInsight(null);

    const profileGoals = user.profile.goals;
    const currentWeight = recentWeight?.weight ?? profileGoals.targetWeight;
    const recentNutrition: NutrientInfo = {
      calories: Math.round(todayStats.totalCalories),
      protein: Math.round(todayStats.totalProtein),
      carbs: Math.round(todayStats.totalCarbs),
      fats: Math.round(todayStats.totalFats),
      fiber: Math.round(micronutrients.fiber || 0),
    };
    const goalsSummary = `Target ${profileGoals.targetCalories} kcal, ${profileGoals.targetProtein}g protein, ${profileGoals.targetCarbs}g carbs, ${profileGoals.targetFats}g fats, ${profileGoals.targetFiber}g fiber per day.`;

    try {
      const result = await getDietaryInsights(
        currentWeight,
        profileGoals.targetWeight,
        recentNutrition,
        goalsSummary
      );
      setInsight(result);
    } catch (error) {
      console.error('Error getting insights:', error);
    } finally {
      setLoadingInsight(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const goals = user?.profile.goals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <DateNavigator />
      </div>

      <MotivationalBanner todayStats={todayStats} targetCalories={goals?.targetCalories || 2000} />

      <OverviewStats
        todayStats={todayStats}
        goals={goals}
        suggestingNutrient={suggestingNutrient}
        onNutrientSuggestion={handleNutrientSuggestion}
      />

      <MicronutrientsPanel
        micronutrients={micronutrients}
        goals={goals}
        suggestingNutrient={suggestingNutrient}
        onNutrientSuggestion={handleNutrientSuggestion}
        isToday={isToday}
        selectedDate={selectedDate}
      />

      <NutrientSuggestionPanel
        suggestingNutrient={suggestingNutrient}
        nutrientSuggestion={nutrientSuggestion}
        onDismiss={() => setNutrientSuggestion(null)}
      />

      <MealSuggestionPanel
        dietPreference={dietPreference}
        setDietPreference={setDietPreference}
        suggestingMeal={suggestingMeal}
        mealSuggestion={mealSuggestion}
        onSuggest={handleMealSuggestion}
        onDismiss={() => setMealSuggestion(null)}
      />

      <InsightPanel
        insight={insight}
        loadingInsight={loadingInsight}
        canGetInsights={!!todayStats}
        onGetInsights={handleGetInsights}
        onDismiss={() => setInsight(null)}
      />

      <MealBreakdownTable mealTypeStats={mealTypeStats} isToday={isToday} selectedDate={selectedDate} />

      <WeightProgress recentWeight={recentWeight} goals={goals} />

      <MacroDistributionChart
        todayStats={todayStats}
        isToday={isToday}
        selectedDate={selectedDate}
      />

      <WeeklyNutritionTrendsChart weeklyData={weeklyData} />
    </div>
  );
};
