import { useState, useEffect, useCallback } from 'react';
import { MealEntry, User } from '../../types';
import { getMealsByUser } from '../../utils/db';
import { getStartOfDay, getEndOfDay } from '../../utils/helpers';

// Loads and exposes the meals logged on `selectedDate` for the current user.
// `loadTodayMeals` returns the freshly fetched list so callers can act on it
// without waiting for state to flush.
export const useTodayMeals = (user: User | null, selectedDate: Date) => {
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);

  const loadTodayMeals = useCallback(async () => {
    if (!user) return [];
    const startOfToday = getStartOfDay(selectedDate);
    const endOfToday = getEndOfDay(selectedDate);

    const meals = await getMealsByUser(user.id);
    const todaysMeals = meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startOfToday && mealDate <= endOfToday;
    });
    setTodayMeals(todaysMeals);
    return todaysMeals;
  }, [user, selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTodayMeals();
  }, [loadTodayMeals]);

  return { todayMeals, loadTodayMeals };
};
