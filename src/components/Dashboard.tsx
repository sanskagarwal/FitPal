import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelectedDate } from '../context/DateContext';
import { DateNavigator } from './DateNavigator';
import { NutrientInfo, DietPreference, MealType, MealSuggestion, NutrientSuggestion, DietaryInsight, MEAL_CALORIE_CAPS } from '../types';
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

// Pick a sensible default meal type from the current time of day. The user can
// override this in the suggestion panel.
const defaultMealTypeForNow = (): MealType => {
  const hour = new Date().getHours();
  if (hour < 10) return MealType.Breakfast;
  if (hour < 12) return MealType.MorningSnack;
  if (hour < 15) return MealType.Lunch;
  if (hour < 18) return MealType.EveningSnack;
  return MealType.Dinner;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const { loading, todayStats, weeklyData, recentWeight, mealTypeStats, micronutrients } =
    useDashboardData(user, selectedDate);

  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[] | null>(null);
  const [suggestingMeal, setSuggestingMeal] = useState(false);
  const [nutrientSuggestion, setNutrientSuggestion] = useState<NutrientSuggestion | null>(null);
  const [suggestingNutrient, setSuggestingNutrient] = useState(false);
  const [insight, setInsight] = useState<DietaryInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [dietPreference, setDietPreference] = useState<DietPreference>(
    user?.profile.dietPreference || DietPreference.Vegetarian
  );
  const [mealType, setMealType] = useState<MealType>(() => defaultMealTypeForNow());
  const [calorieCap, setCalorieCap] = useState<number>(() => MEAL_CALORIE_CAPS[defaultMealTypeForNow()]);

  // Changing the meal type resets the calorie cap to that meal's default. The
  // user can still override it afterwards via the cap input.
  const handleMealTypeChange = (value: MealType) => {
    setMealType(value);
    setCalorieCap(MEAL_CALORIE_CAPS[value]);
  };

  // Re-sync the diet preference on user switch (adjust state during render).
  const [prevDietPreference, setPrevDietPreference] = useState(user?.profile.dietPreference);
  if (user?.profile.dietPreference !== prevDietPreference) {
    setPrevDietPreference(user?.profile.dietPreference);
    setDietPreference(user?.profile.dietPreference || DietPreference.Vegetarian);
  }

  const handleMealSuggestion = async () => {
    if (!user || !todayStats) return;

    setSuggestingMeal(true);
    setMealSuggestions(null);

    const goals = user.profile.goals;
    const remainingCalories = goals.targetCalories - todayStats.totalCalories;
    const remainingProtein = goals.targetProtein - todayStats.totalProtein;
    const remainingCarbs = goals.targetCarbs - todayStats.totalCarbs;
    const remainingFats = goals.targetFats - todayStats.totalFats;
    const remainingFiber = (goals.targetFiber || 30) - (micronutrients.fiber || 0);

    try {
      const suggestion = await suggestMeal(
        Math.round(remainingCalories),
        Math.round(remainingProtein),
        Math.round(remainingCarbs),
        Math.round(remainingFats),
        Math.round(remainingFiber),
        mealType,
        dietPreference,
        calorieCap
      );
      setMealSuggestions(suggestion);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
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
        mealType={mealType}
        setMealType={handleMealTypeChange}
        calorieCap={calorieCap}
        setCalorieCap={setCalorieCap}
        suggestingMeal={suggestingMeal}
        mealSuggestions={mealSuggestions}
        onSuggest={handleMealSuggestion}
        onDismiss={() => setMealSuggestions(null)}
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
