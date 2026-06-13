import { AnimatePresence, motion } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import { MealEntry } from '../../types';
import { formatDayLabel } from '../../utils/helpers';
import { getMealImageUrl } from '../../utils/db';
import { formatUnit } from './foodLoggerUtils';

interface TodayMealsHistoryProps {
  todayMeals: MealEntry[];
  isToday: boolean;
  selectedDate: Date;
  loading: boolean;
  editingMealId: string | null;
  onStartEdit: (meal: MealEntry) => void;
  onDelete: (mealId: string) => void;
}

export const TodayMealsHistory = ({
  todayMeals,
  isToday,
  selectedDate,
  loading,
  editingMealId,
  onStartEdit,
  onDelete,
}: TodayMealsHistoryProps) => {
  if (todayMeals.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-xl font-semibold mb-4">{isToday ? "Today's Meals" : `Meals · ${formatDayLabel(selectedDate)}`}</h3>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
        {todayMeals.map((meal) => (
          <motion.div
            key={meal.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {meal.mealType.replace('-', ' ')}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onStartEdit(meal)}
                  disabled={loading || editingMealId !== null}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  aria-label={`Edit ${meal.mealType.replace('-', ' ')}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(meal.id)}
                  disabled={loading}
                  className="inline-flex items-center justify-center min-h-11 min-w-11 text-red-600 hover:text-red-800 disabled:opacity-50"
                  aria-label={`Delete ${meal.mealType.replace('-', ' ')}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {meal.hasImage && (
              <img
                src={getMealImageUrl(meal.userId, meal.id)}
                alt={`Photo of ${meal.mealType.replace('-', ' ')}`}
                loading="lazy"
                className="mb-3 max-h-48 w-full rounded-lg object-cover"
              />
            )}

            <div className="divide-y divide-gray-200 dark:divide-gray-700 mb-3">
              {meal.foods.map((foodEntry, idx) => {
                const q = foodEntry.quantity || foodEntry.unitQuantity || 1;
                const n = foodEntry.food.nutrients;
                const unitLabel = formatUnit(foodEntry.unit, foodEntry.unitQuantity);
                return (
                  <div key={idx} className="py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 capitalize truncate">
                          {foodEntry.food.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {foodEntry.unitQuantity} {unitLabel}
                          {foodEntry.food.servingSize ? ` • ${foodEntry.food.servingSize}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {Math.round(n.calories * q)} cal
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>P {Math.round(n.protein * q)}g</span>
                      <span>C {Math.round(n.carbs * q)}g</span>
                      <span>F {Math.round(n.fats * q)}g</span>
                      {n.fiber ? <span>Fiber {Math.round(n.fiber * q)}g</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm border-t dark:border-gray-700 pt-2">
              <div>
                <span className="text-gray-600 dark:text-gray-300">Calories:</span>
                <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.calories)}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Protein:</span>
                <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.protein)}g</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Carbs:</span>
                <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.carbs)}g</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300">Fats:</span>
                <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.fats)}g</span>
              </div>
            </div>

            {meal.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">Note: {meal.notes}</p>
            )}
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
