import { useState } from 'react';
import { Food, FoodEntry, MealEntry, MealType, MealUnit, NutrientInfo, User } from '../../types';
import { saveMeal, updateMeal, deleteMeal } from '../../utils/db';
import { reestimateNutrientsForUnit } from '../../services/openai';
import { generateId, combineDateWithCurrentTime } from '../../utils/helpers';
import { ToastType } from '../Toast';
import { clampNumber, sumNutrients, MAX_CALORIES, MAX_QUANTITY } from './foodLoggerUtils';

type SetToast = (toast: { message: string; type: ToastType }) => void;

interface UseMealEditorArgs {
  user: User | null;
  selectedDate: Date;
  loadTodayMeals: () => Promise<MealEntry[]>;
  todayMeals: MealEntry[];
  setToast: SetToast;
}

// Owns the "add manually" meal builder: the selected foods, meal type, notes,
// and the create/update flows. Wraps the existing save/update db calls only.
export const useMealEditor = ({ user, selectedDate, loadTodayMeals, todayMeals, setToast }: UseMealEditorArgs) => {
  const [selectedFoods, setSelectedFoods] = useState<FoodEntry[]>([]);
  const [mealType, setMealType] = useState<MealType>(MealType.Breakfast);
  const [notes, setNotes] = useState('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Index of the selected food whose nutrition is being re-estimated after a unit change.
  const [reestimatingIndex, setReestimatingIndex] = useState<number | null>(null);

  const calculateTotalNutrients = (): NutrientInfo =>
    sumNutrients(selectedFoods.map((entry) => ({ nutrients: entry.food.nutrients, quantity: entry.quantity })));

  const addFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, {
      food,
      quantity: 1,
      unit: MealUnit.Serving,
      unitQuantity: 1
    }]);
  };

  const removeFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, unitQuantity: number, unit: MealUnit) => {
    const safeQuantity = clampNumber(unitQuantity, 0, MAX_QUANTITY, 1);
    const updated = [...selectedFoods];
    updated[index].unitQuantity = safeQuantity;
    updated[index].unit = unit;
    // Calculate multiplier based on unit (for now, use unitQuantity as multiplier)
    // In a real app, you'd convert units to servings properly
    updated[index].quantity = safeQuantity;
    setSelectedFoods(updated);
  };

  // Changing the unit changes what "one unit" means, so ask the AI to re-estimate
  // the per-unit nutrition for the new unit.
  const changeFoodUnit = async (index: number, unit: MealUnit) => {
    const entry = selectedFoods[index];
    if (!entry || entry.unit === unit) return;

    // Apply the unit immediately for responsiveness.
    const updated = [...selectedFoods];
    updated[index] = { ...entry, unit };
    setSelectedFoods(updated);

    setReestimatingIndex(index);
    try {
      const { servingSize, confidence, nutrients } = await reestimateNutrientsForUnit(entry.food.name, unit);
      setSelectedFoods((prev) =>
        prev.map((e, i) =>
          i === index
            ? { ...e, unit, food: { ...e.food, servingSize, confidence, nutrients } }
            : e
        )
      );
    } catch (err) {
      console.error('Error re-estimating nutrition for unit change:', err);
      setToast({ message: 'Could not update nutrition for the new unit. Please check the calories.', type: 'error' });
    } finally {
      setReestimatingIndex(null);
    }
  };

  // Override the per-unit calories of a selected food (used to correct AI estimates).
  const updateFoodCalories = (index: number, calories: number) => {
    const safeCalories = clampNumber(calories, 0, MAX_CALORIES, 0);
    const updated = [...selectedFoods];
    const entry = updated[index];
    entry.food = {
      ...entry.food,
      nutrients: { ...entry.food.nutrients, calories: safeCalories },
      confidence: 'high', // user has confirmed/corrected the value
    };
    setSelectedFoods(updated);
  };

  const saveMealEntry = async () => {
    if (!user || selectedFoods.length === 0) return;

    const totalNutrients = calculateTotalNutrients();

    const meal: MealEntry = {
      id: generateId(),
      userId: user.id,
      date: combineDateWithCurrentTime(selectedDate),
      mealType,
      foods: selectedFoods,
      totalNutrients,
      notes: notes || undefined,
    };

    try {
      await saveMeal(meal);
      // Reset form
      setSelectedFoods([]);
      setNotes('');
      await loadTodayMeals();
      setToast({ message: 'Meal logged successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving meal:', error);
      setToast({ message: 'Failed to log meal. Please try again.', type: 'error' });
    }
  };

  const startEditMeal = (meal: MealEntry) => {
    setEditingMealId(meal.id);
    setSelectedFoods(meal.foods);
    setMealType(meal.mealType);
    setNotes(meal.notes || '');
  };

  const cancelEditMeal = () => {
    setEditingMealId(null);
    setSelectedFoods([]);
    setNotes('');
  };

  const saveEditedMeal = async () => {
    if (!user || !editingMealId || selectedFoods.length === 0) return;

    setLoading(true);
    try {
      const originalMeal = todayMeals.find(m => m.id === editingMealId);
      if (!originalMeal) return;

      const totalNutrients = calculateTotalNutrients();

      const updatedMeal: MealEntry = {
        ...originalMeal,
        mealType,
        foods: selectedFoods,
        totalNutrients,
        notes: notes || undefined,
      };

      await updateMeal(updatedMeal);
      cancelEditMeal();
      await loadTodayMeals();
      setToast({ message: 'Meal updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating meal:', error);
      setToast({ message: 'Failed to update meal. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!user || !confirm('Are you sure you want to delete this meal?')) return;

    setLoading(true);
    try {
      await deleteMeal(mealId, user.id);
      await loadTodayMeals();
      setToast({ message: 'Meal deleted successfully!', type: 'success' });
    } catch (error) {
      console.error('Error deleting meal:', error);
      setToast({ message: 'Failed to delete meal. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedFoods,
    mealType,
    setMealType,
    notes,
    setNotes,
    editingMealId,
    loading,
    reestimatingIndex,
    calculateTotalNutrients,
    addFood,
    removeFood,
    updateQuantity,
    changeFoodUnit,
    updateFoodCalories,
    saveMealEntry,
    startEditMeal,
    cancelEditMeal,
    saveEditedMeal,
    handleDeleteMeal,
  };
};
