import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Food, MealEntry, FoodEntry, NutrientInfo } from '../types';
import { analyzeFoodWithAI } from '../services/openai';
import { saveMeal } from '../utils/db';
import { generateId } from '../utils/helpers';
import { Search, Plus, X } from 'lucide-react';

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await analyzeFoodWithAI(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
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
      alert('Meal logged successfully!');
    } catch (error) {
      console.error('Error saving meal:', error);
      alert('Failed to log meal. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
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
          <button onClick={saveMealEntry} className="btn-primary w-full mt-4">
            Log Meal
          </button>
        </div>
      )}
    </div>
  );
};
