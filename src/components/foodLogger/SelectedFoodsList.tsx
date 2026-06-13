import { X } from 'lucide-react';
import { FoodEntry, MealType, MealUnit, NutrientInfo } from '../../types';
import { Spinner } from '../Spinner';
import { ConfidenceBadge } from './ConfidenceBadge';
import { FoodQuantityInput } from './FoodQuantityInput';
import { MEAL_TYPES } from './foodLoggerUtils';

interface SelectedFoodsListProps {
  selectedFoods: FoodEntry[];
  reestimatingIndex: number | null;
  editingMealId: string | null;
  mealType: MealType;
  setMealType: (type: MealType) => void;
  notes: string;
  setNotes: (value: string) => void;
  calculateTotalNutrients: () => NutrientInfo;
  onUpdateFoodCalories: (index: number, calories: number) => void;
  onUpdateQuantity: (index: number, unitQuantity: number, unit: MealUnit) => void;
  onChangeFoodUnit: (index: number, unit: MealUnit) => void;
  onRemoveFood: (index: number) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

export const SelectedFoodsList = ({
  selectedFoods,
  reestimatingIndex,
  editingMealId,
  mealType,
  setMealType,
  notes,
  setNotes,
  calculateTotalNutrients,
  onUpdateFoodCalories,
  onUpdateQuantity,
  onChangeFoodUnit,
  onRemoveFood,
  onSave,
  onCancelEdit,
}: SelectedFoodsListProps) => {
  // Hide the card when there is nothing to show, but keep it visible while
  // editing even if every food was removed - otherwise the Cancel Edit button
  // disappears and the meal stays stuck in edit mode (its row's Edit button
  // disabled with no way out).
  if (selectedFoods.length === 0 && !editingMealId) return null;

  const isEmpty = selectedFoods.length === 0;

  return (
    <div className="card">
      <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-4">Selected Foods</h3>
      <div className="space-y-3">
        {selectedFoods.map((entry, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium flex items-center gap-2">
                <span className="truncate">{entry.food.name}</span>
                <ConfidenceBadge confidence={entry.food.confidence} />
              </p>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                <span>{entry.food.servingSize} •</span>
                {reestimatingIndex === index ? (
                  <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Spinner className="w-3.5 h-3.5" /> updating...
                  </span>
                ) : (
                  <>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="10"
                      value={Math.round(entry.food.nutrients.calories)}
                      onChange={(e) => onUpdateFoodCalories(index, parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded text-sm"
                      title="Calories per unit - edit if the estimate looks off"
                      aria-label={`Calories per unit for ${entry.food.name}`}
                    />
                    <span>cal each</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FoodQuantityInput
                unitQuantity={entry.unitQuantity}
                unit={entry.unit}
                disabled={reestimatingIndex === index}
                name={entry.food.name}
                onQuantityChange={(unitQuantity) => onUpdateQuantity(index, unitQuantity, entry.unit)}
                onUnitChange={(unit) => onChangeFoodUnit(index, unit)}
              />
              <button
                onClick={() => onRemoveFood(index)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                aria-label={`Remove ${entry.food.name}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
        <h4 className="font-semibold mb-2">Total Nutrition</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-300">Calories</p>
            <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().calories)}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300">Protein</p>
            <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().protein)}g</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300">Carbs</p>
            <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().carbs)}g</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300">Fats</p>
            <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().fats)}g</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Meal Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`py-2 px-4 rounded-lg font-medium transition-colors capitalize active:scale-[0.97] ${
                mealType === type
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes about this meal..."
          className="input-field"
          rows={3}
        />
      </div>

      {/* Save Button */}
      {isEmpty && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Add at least one food, or cancel the edit.
        </p>
      )}
      <button onClick={onSave} disabled={isEmpty} className="btn-primary w-full mt-4 disabled:opacity-50">
        {editingMealId ? 'Update Meal' : 'Log Meal'}
      </button>
      {editingMealId && (
        <button onClick={onCancelEdit} className="btn-secondary w-full mt-2">
          Cancel Edit
        </button>
      )}
    </div>
  );
};
