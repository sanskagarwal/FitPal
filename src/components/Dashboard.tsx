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
import { defaultMealTypeForNow } from '../utils/helpers';
import { useDashboardData } from './dashboard/useDashboardData';
import { DaySummaryHero } from './dashboard/DaySummaryHero';
import { MealSuggestionPanel } from './dashboard/MealSuggestionPanel';
import { InsightPanel } from './dashboard/InsightPanel';
import { MealBreakdownTable } from './dashboard/MealBreakdownTable';
import { MicronutrientsPanel } from './dashboard/MicronutrientsPanel';
import { NutrientSuggestionPanel } from './dashboard/NutrientSuggestionPanel';
import { TrendsSection } from './dashboard/trends/TrendsSection';

// Small eyebrow label used to group the dashboard into visual sections. Kept as
// a paragraph (not a heading) so it doesn't disturb the card heading hierarchy.
const SectionLabel = ({ children }: { children: string }) => (
  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
    {children}
  </p>
);

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user } = useAuth();
  const { selectedDate, isToday } = useSelectedDate();
  const { loading, todayStats, recentWeight, mealTypeStats, micronutrients } =
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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <DateNavigator />
      </div>

      <section className="space-y-4">
        <SectionLabel>Today's progress</SectionLabel>

        <DaySummaryHero
          todayStats={todayStats}
          goals={goals}
          onLogMeal={onNavigate ? () => onNavigate('log-food') : undefined}
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

        <MealBreakdownTable
          mealTypeStats={mealTypeStats}
          goals={goals}
          dietPreference={dietPreference}
          isToday={isToday}
          selectedDate={selectedDate}
        />
      </section>

      <section className="space-y-4">
        <SectionLabel>AI coach</SectionLabel>

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
      </section>

      <section className="space-y-4">
        <SectionLabel>Trends &amp; progress</SectionLabel>

        <TrendsSection user={user} goals={goals} />
      </section>
    </div>
  );
};
