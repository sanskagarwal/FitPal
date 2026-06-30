import { useEffect, useState } from 'react';
import { MealEntry, MealType } from '../../types';
import { getRecentMeals } from '../../utils/db';
import { isSameDay } from '../../utils/helpers';

interface RecentMealsProps {
  userId: string;
  selectedDate: Date;
  onRelog: (meal: MealEntry) => void;
}

const MEAL_TYPE_STYLES: Record<MealType, string> = {
  [MealType.Breakfast]:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  [MealType.MorningSnack]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  [MealType.Lunch]:        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  [MealType.EveningSnack]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  [MealType.Dinner]:       'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

export const RecentMeals = ({ userId, selectedDate, onRelog }: RecentMealsProps) => {
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    getRecentMeals(userId, 20).then((all) => {
      // Keep only meals from days other than the currently selected date,
      // deduped by mealType (most recent wins). At most 5 cards -- one per type.
      const seen = new Set<MealType>();
      const filtered: MealEntry[] = [];
      for (const m of all) {
        if (isSameDay(new Date(m.date), selectedDate)) continue;
        if (seen.has(m.mealType)) continue;
        seen.add(m.mealType);
        filtered.push(m);
      }
      setMeals(filtered);
    });
  }, [userId, selectedDate]);

  if (meals.length === 0) return null;

  return (
    <div data-no-swipe>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Quick re-log
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {meals.map((meal) => {
          const calories = Math.round(meal.totalNutrients.calories);
          const foodNames = meal.foods.map((f) => f.food.name).join(', ');
          return (
            <div
              key={meal.id}
              className="flex-shrink-0 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex flex-col gap-2"
            >
              <span
                className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${MEAL_TYPE_STYLES[meal.mealType]}`}
              >
                {meal.mealType}
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug">
                {foodNames}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{calories} kcal</p>
              <button
                onClick={() => onRelog(meal)}
                className="mt-auto btn-secondary text-xs py-1.5"
              >
                Re-log
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
