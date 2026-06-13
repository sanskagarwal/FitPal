import { useState, useEffect, useCallback } from 'react';
import { MealEntry, WeightEntry, User } from '../../../types';
import {
  getMealsByDateRange,
  getMealsByUser,
  getWeightsByDateRange,
  getWeightsByUser,
} from '../../../utils/db';
import { getStartOfDay, getEndOfDay, getDaysInRange, calculateStreak } from '../../../utils/helpers';

// The selectable trend windows. Numeric values are "most recent N days"
// (anchored to today); 'all' spans from the first logged entry through today.
export type TrendRange = 7 | 30 | 90 | 'all';

export interface TrendDay {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealsLogged: number;
}

export interface WeightPoint {
  date: string;
  weight: number;
  bmi: number;
}

const MS_PER_DAY = 86_400_000;

const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Loads meals and weights for the chosen range and derives the per-day nutrition
// series, the weight series, and logging adherence/streak. Numeric ranges hit
// the backend date-range endpoints; 'all' fetches the full history once.
export const useTrendsData = (user: User | null, range: TrendRange) => {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<TrendDay[]>([]);
  const [weightSeries, setWeightSeries] = useState<WeightPoint[]>([]);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);
  const [startWeight, setStartWeight] = useState<WeightEntry | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date();
      const endOfToday = getEndOfDay(today);

      let meals: MealEntry[];
      let weights: WeightEntry[];
      let startDay: Date;

      if (range === 'all') {
        [meals, weights] = await Promise.all([
          getMealsByUser(user.id),
          getWeightsByUser(user.id),
        ]);
        const earliest = [...meals, ...weights]
          .map((e) => new Date(e.date).getTime())
          .filter((t) => !Number.isNaN(t));
        startDay = getStartOfDay(earliest.length ? new Date(Math.min(...earliest)) : today);
      } else {
        startDay = getStartOfDay(new Date(today.getTime() - (range - 1) * MS_PER_DAY));
        [meals, weights] = await Promise.all([
          getMealsByDateRange(user.id, startDay, endOfToday),
          getWeightsByDateRange(user.id, startDay, endOfToday),
        ]);
      }

      // Bucket meals by calendar day so each day in the window gets its totals.
      const mealsByDay = new Map<string, MealEntry[]>();
      for (const meal of meals) {
        const key = dayKey(new Date(meal.date));
        const list = mealsByDay.get(key);
        if (list) list.push(meal);
        else mealsByDay.set(key, [meal]);
      }

      const dayList: TrendDay[] = getDaysInRange(startDay, getStartOfDay(today)).map((d) => {
        const dayMeals = mealsByDay.get(dayKey(d)) ?? [];
        const totals = dayMeals.reduce(
          (acc, m) => ({
            calories: acc.calories + m.totalNutrients.calories,
            protein: acc.protein + m.totalNutrients.protein,
            carbs: acc.carbs + m.totalNutrients.carbs,
            fats: acc.fats + m.totalNutrients.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
        );
        return { date: d, ...totals, mealsLogged: dayMeals.length };
      });
      setDays(dayList);

      // Weight series in chronological order for the line chart.
      const sortedWeights = [...weights].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setWeightSeries(
        sortedWeights.map((w) => ({
          date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: w.weight,
          bmi: w.bmi,
        }))
      );
      setStartWeight(sortedWeights[0] ?? null);
      setLatestWeight(sortedWeights[sortedWeights.length - 1] ?? null);

      // calculateStreak dedupes by calendar day, so passing raw meal dates is fine.
      setCurrentStreak(calculateStreak(meals.map((m) => new Date(m.date))));
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const daysLogged = days.filter((d) => d.mealsLogged > 0).length;
  const totalDays = days.length;
  const adherence = totalDays > 0 ? Math.round((daysLogged / totalDays) * 100) : 0;
  const weightChange =
    latestWeight && startWeight && latestWeight.id !== startWeight.id
      ? Number((latestWeight.weight - startWeight.weight).toFixed(1))
      : null;

  return {
    loading,
    days,
    weightSeries,
    daysLogged,
    totalDays,
    adherence,
    currentStreak,
    latestWeight,
    startWeight,
    weightChange,
  };
};
