import { useState, useEffect, useCallback } from 'react';
import { MealEntry, DailyStats, WeightEntry, NutrientInfo, MealType, User } from '../../types';
import { getMealsByDateRange, getWeightsByUser } from '../../utils/db';
import { getStartOfDay, getEndOfDay } from '../../utils/helpers';

export interface MealTypeStats {
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  isLogged: boolean;
}

const calculateTotals = (meals: MealEntry[]) =>
  meals.reduce(
    (acc, meal) => ({
      totalCalories: acc.totalCalories + meal.totalNutrients.calories,
      totalProtein: acc.totalProtein + meal.totalNutrients.protein,
      totalCarbs: acc.totalCarbs + meal.totalNutrients.carbs,
      totalFats: acc.totalFats + meal.totalNutrients.fats,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
  );

// Loads the selected day's meals, the week-to-date trend, and recent weight,
// then derives per-meal-type and micronutrient totals. Wraps the existing db
// calls only.
export const useDashboardData = (user: User | null, selectedDate: Date) => {
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [recentWeight, setRecentWeight] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const day = selectedDate;
      const startOfToday = getStartOfDay(day);
      const endOfToday = getEndOfDay(day);

      // Load the selected day's meals
      const meals = await getMealsByDateRange(user.id, startOfToday, endOfToday);
      setTodayMeals(meals);
      const todayTotals = calculateTotals(meals);
      setTodayStats({
        date: day,
        ...todayTotals,
        mealsLogged: meals.length,
      });

      // Load recent weight
      const weights = await getWeightsByUser(user.id);
      if (weights.length > 0) {
        setRecentWeight(weights[0]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, [loadDashboardData]);

  // One entry per meal type (in enum order), whether or not it has logged meals.
  // The breakdown UI shows every meal against its target, with unlogged meals
  // rendered muted.
  const mealTypeStats: MealTypeStats[] = Object.values(MealType).map((mealType) => {
    const mealsOfType = todayMeals.filter((m) => m.mealType === mealType);
    const totals = mealsOfType.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.totalNutrients.calories,
        protein: acc.protein + meal.totalNutrients.protein,
        carbs: acc.carbs + meal.totalNutrients.carbs,
        fats: acc.fats + meal.totalNutrients.fats,
        fiber: acc.fiber + (meal.totalNutrients.fiber || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    return {
      mealType,
      ...totals,
      isLogged: mealsOfType.length > 0,
    };
  });

  const micronutrients: Partial<NutrientInfo> = todayMeals.reduce<Partial<NutrientInfo>>(
    (acc, meal) => ({
      fiber: (acc.fiber || 0) + (meal.totalNutrients.fiber || 0),
      vitaminA: (acc.vitaminA || 0) + (meal.totalNutrients.vitaminA || 0),
      vitaminC: (acc.vitaminC || 0) + (meal.totalNutrients.vitaminC || 0),
      vitaminD: (acc.vitaminD || 0) + (meal.totalNutrients.vitaminD || 0),
      calcium: (acc.calcium || 0) + (meal.totalNutrients.calcium || 0),
      iron: (acc.iron || 0) + (meal.totalNutrients.iron || 0),
      magnesium: (acc.magnesium || 0) + (meal.totalNutrients.magnesium || 0),
      potassium: (acc.potassium || 0) + (meal.totalNutrients.potassium || 0),
    }),
    {}
  );

  return {
    loading,
    todayStats,
    todayMeals,
    recentWeight,
    mealTypeStats,
    micronutrients,
  };
};
