import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Food, MealEntry, FoodEntry, NutrientInfo } from '../types';
import { analyzeFoodWithAI } from '../services/openai';
import { saveMeal, getMealsByUser, updateMeal, deleteMeal } from '../utils/db';
import { generateId, getStartOfDay, getEndOfDay } from '../utils/helpers';
import { Search, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { Toast, ToastType } from './Toast';

const MEAL_TYPES = ['breakfast', 'morning-snack', 'lunch', 'evening-snack', 'dinner'] as const;
const QUANTITY_UNITS = ['serving', 'cup', 'tbsp', 'tsp', 'piece', 'gram', 'oz'] as const;

export const FoodLogger = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<FoodEntry[]>([]);
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number]>('breakfast');
  const [notes, setNotes] = useState('');
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    loadTodayMeals();
  }, [user]);

  const loadTodayMeals = async () => {
    if (!user) return;
    const today = new Date();
    const startOfToday = getStartOfDay(today);
    const endOfToday = getEndOfDay(today);
    
    const meals = await getMealsByUser(user.id);
    const todaysMeals = meals.filter(meal => {
      const mealDate = new Date(meal.date);
      return mealDate >= startOfToday && mealDate <= endOfToday;
    });
    setTodayMeals(todaysMeals);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    try {
      const results = await analyzeFoodWithAI(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to search for food. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const addFood = (food: Food) => {
    setSelectedFoods([...selectedFoods, { 
      food, 
      quantity: 1,
      unit: 'serving',
      unitQuantity: 1
    }]);
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeFood = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, unitQuantity: number, unit: typeof QUANTITY_UNITS[number]) => {
    const updated = [...selectedFoods];
    updated[index].unitQuantity = unitQuantity;
    updated[index].unit = unit;
    // Calculate multiplier based on unit (for now, use unitQuantity as multiplier)
    // In a real app, you'd convert units to servings properly
    updated[index].quantity = unitQuantity;
    setSelectedFoods(updated);
  };

  const calculateTotalNutrients = (): NutrientInfo => {
    return selectedFoods.reduce(
      (acc, entry) => {
        const nutrients = entry.food.nutrients;
        return {
          calories: acc.calories + nutrients.calories * entry.quantity,
          protein: acc.protein + nutrients.protein * entry.quantity,
          carbs: acc.carbs + nutrients.carbs * entry.quantity,
          fats: acc.fats + nutrients.fats * entry.quantity,
          fiber: (acc.fiber || 0) + (nutrients.fiber || 0) * entry.quantity,
          sugar: (acc.sugar || 0) + (nutrients.sugar || 0) * entry.quantity,
          sodium: (acc.sodium || 0) + (nutrients.sodium || 0) * entry.quantity,
          vitaminA: (acc.vitaminA || 0) + (nutrients.vitaminA || 0) * entry.quantity,
          vitaminC: (acc.vitaminC || 0) + (nutrients.vitaminC || 0) * entry.quantity,
          vitaminD: (acc.vitaminD || 0) + (nutrients.vitaminD || 0) * entry.quantity,
          calcium: (acc.calcium || 0) + (nutrients.calcium || 0) * entry.quantity,
          iron: (acc.iron || 0) + (nutrients.iron || 0) * entry.quantity,
          magnesium: (acc.magnesium || 0) + (nutrients.magnesium || 0) * entry.quantity,
          potassium: (acc.potassium || 0) + (nutrients.potassium || 0) * entry.quantity,
        };
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        calcium: 0,
        iron: 0,
        magnesium: 0,
        potassium: 0,
      }
    );
  };

  const saveMealEntry = async () => {
    if (!user || selectedFoods.length === 0) return;

    const totalNutrients = calculateTotalNutrients();

    const meal: MealEntry = {
      id: generateId(),
      userId: user.id,
      date: new Date(),
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

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <h1 className="text-3xl font-bold text-gray-900">Log Your Meal</h1>

      {/* Meal Type Selection */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`py-2 px-4 rounded-lg font-medium transition-colors capitalize ${
                mealType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Food Search */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Indian Foods
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., dosa, dal, roti, paneer tikka..."
            className="input-field flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-primary"
          >
            {searching ? (
              'Searching...'
            ) : (
              <>
                <Search className="inline w-4 h-4 mr-2" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">Error:</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium text-gray-700">Search Results:</h3>
            {searchResults.map((food) => (
              <div
                key={food.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{food.name}</p>
                  <p className="text-sm text-gray-600">
                    {food.servingSize} • {food.nutrients.calories} cal
                  </p>
                </div>
                <button
                  onClick={() => addFood(food)}
                  className="btn-primary text-sm"
                >
                  <Plus className="inline w-4 h-4" />
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Foods */}
      {selectedFoods.length > 0 && (
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-4">Selected Foods</h3>
          <div className="space-y-3">
            {selectedFoods.map((entry, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{entry.food.name}</p>
                  <p className="text-sm text-gray-600">
                    {entry.food.servingSize} • {entry.food.nutrients.calories} cal each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={entry.unitQuantity}
                    onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 1, entry.unit)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                  <select
                    value={entry.unit}
                    onChange={(e) => updateQuantity(index, entry.unitQuantity, e.target.value as typeof QUANTITY_UNITS[number])}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {QUANTITY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => removeFood(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 p-4 bg-primary-50 rounded-lg">
            <h4 className="font-semibold mb-2">Total Nutrition</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Calories</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().calories)}</p>
              </div>
              <div>
                <p className="text-gray-600">Protein</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().protein)}g</p>
              </div>
              <div>
                <p className="text-gray-600">Carbs</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().carbs)}g</p>
              </div>
              <div>
                <p className="text-gray-600">Fats</p>
                <p className="text-lg font-bold">{Math.round(calculateTotalNutrients().fats)}g</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
          <button onClick={editingMealId ? saveEditedMeal : saveMealEntry} className="btn-primary w-full mt-4">
            {editingMealId ? 'Update Meal' : 'Log Meal'}
          </button>
          {editingMealId && (
            <button onClick={cancelEditMeal} className="btn-secondary w-full mt-2">
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* Today's Meals History */}
      {todayMeals.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">Today's Meals</h3>
          <div className="space-y-3">
            {todayMeals.map((meal) => (
              <div key={meal.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {meal.mealType.replace('-', ' ')}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditMeal(meal)}
                      disabled={loading || editingMealId !== null}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1 mb-3">
                  {meal.foods.map((foodEntry, idx) => (
                    <p key={idx} className="text-sm text-gray-700">
                      • {foodEntry.food.name} - {foodEntry.unitQuantity} {foodEntry.unit}
                    </p>
                  ))}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-sm border-t pt-2">
                  <div>
                    <span className="text-gray-600">Calories:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.calories)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Protein:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.protein)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Carbs:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.carbs)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fats:</span>
                    <span className="ml-1 font-semibold">{Math.round(meal.totalNutrients.fats)}g</span>
                  </div>
                </div>
                
                {meal.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">Note: {meal.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
