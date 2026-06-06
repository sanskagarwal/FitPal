import { useState } from 'react';
import { Sparkles, X, UtensilsCrossed } from 'lucide-react';
import { DietPreference, MealType, MealSuggestion, MEAL_CALORIE_CAPS } from '../../types';
import { formatMealTypeLabel } from '../../utils/helpers';
import { Spinner, LoadingBlock } from '../Spinner';

interface MealSuggestionPanelProps {
  dietPreference: DietPreference;
  setDietPreference: (value: DietPreference) => void;
  mealType: MealType;
  setMealType: (value: MealType) => void;
  calorieCap: number;
  setCalorieCap: (value: number) => void;
  suggestingMeal: boolean;
  mealSuggestions: MealSuggestion[] | null;
  onSuggest: () => void;
  onDismiss: () => void;
}

export const MealSuggestionPanel = ({
  dietPreference,
  setDietPreference,
  mealType,
  setMealType,
  calorieCap,
  setCalorieCap,
  suggestingMeal,
  mealSuggestions,
  onSuggest,
  onDismiss,
}: MealSuggestionPanelProps) => {
  const defaultCap = MEAL_CALORIE_CAPS[mealType];
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset to the first option whenever a new set of suggestions arrives
  // (e.g. after shuffling), so the active tab never points past the list.
  // React's recommended "adjust state during render" pattern.
  const [prevSuggestions, setPrevSuggestions] = useState(mealSuggestions);
  if (mealSuggestions !== prevSuggestions) {
    setPrevSuggestions(mealSuggestions);
    setActiveIndex(0);
  }

  const activeSuggestion = mealSuggestions?.[activeIndex] ?? null;
  return (
    <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold">AI Meal Suggestions</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            disabled={suggestingMeal}
            className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            aria-label="Meal type"
          >
            {Object.values(MealType).map((type) => (
              <option key={type} value={type}>
                {formatMealTypeLabel(type)}
              </option>
            ))}
          </select>
          <select
            value={dietPreference}
            onChange={(e) => setDietPreference(e.target.value as DietPreference)}
            disabled={suggestingMeal}
            className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            aria-label="Dietary preference"
          >
            <option value={DietPreference.Vegetarian}>Vegetarian</option>
            <option value={DietPreference.Eggetarian}>Eggetarian</option>
            <option value={DietPreference.NonVegetarian}>Non-vegetarian</option>
          </select>
          <button
            onClick={onSuggest}
            disabled={suggestingMeal}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {suggestingMeal && <Spinner className="w-4 h-4" />}
            {suggestingMeal ? 'Generating...' : mealSuggestions ? 'Shuffle' : 'Get Suggestions'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <label htmlFor="meal-calorie-cap" className="text-sm font-medium text-gray-700">
          Calorie cap for {formatMealTypeLabel(mealType)}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="meal-calorie-cap"
            type="number"
            min={100}
            max={2000}
            step={50}
            value={calorieCap}
            disabled={suggestingMeal}
            onChange={(e) => setCalorieCap(Number(e.target.value))}
            className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <span className="text-sm text-gray-500">kcal</span>
          {calorieCap !== defaultCap && (
            <button
              type="button"
              onClick={() => setCalorieCap(defaultCap)}
              disabled={suggestingMeal}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Reset to {defaultCap}
            </button>
          )}
        </div>
      </div>
      {suggestingMeal ? (
        <div className="bg-white p-4 rounded-lg">
          <LoadingBlock label="Building meals around your remaining goals…" />
        </div>
      ) : mealSuggestions && mealSuggestions.length > 0 && activeSuggestion ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Meal options">
              {mealSuggestions.map((suggestion, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                    }`}
                    title={suggestion.name}
                  >
                    Option {index + 1}
                  </button>
                );
              })}
            </nav>
            <button
              onClick={onDismiss}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              aria-label="Dismiss suggestions"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {/* Meal header */}
            <div className="flex items-start gap-3 p-4 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[11px] font-medium uppercase tracking-wide text-primary-600">
                  {formatMealTypeLabel(activeSuggestion.mealType)}
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug break-words">
                  {activeSuggestion.name}
                </h3>
                {activeSuggestion.description && (
                  <p className="text-sm text-gray-600 mt-0.5">{activeSuggestion.description}</p>
                )}
              </div>
            </div>

            {/* Nutrition pills */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4 border-b border-gray-100">
              {[
                { label: 'Calories', value: activeSuggestion.nutrition.calories, unit: '', color: 'text-gray-900' },
                { label: 'Protein', value: activeSuggestion.nutrition.protein, unit: 'g', color: 'text-red-600' },
                { label: 'Carbs', value: activeSuggestion.nutrition.carbs, unit: 'g', color: 'text-blue-600' },
                { label: 'Fats', value: activeSuggestion.nutrition.fats, unit: 'g', color: 'text-amber-600' },
                { label: 'Fiber', value: activeSuggestion.nutrition.fiber, unit: 'g', color: 'text-purple-600' },
              ].map((m) => (
                <div key={m.label} className="text-center bg-gray-50 rounded-lg py-2 px-1">
                  <p className={`text-base sm:text-lg font-bold ${m.color}`}>{m.value}{m.unit}</p>
                  <p className="text-[11px] text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Ingredients */}
            {activeSuggestion.ingredients.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  What's in it
                </h4>
                <ul className="space-y-1.5">
                  {activeSuggestion.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-800">{ing.item}</span>
                      <span className="flex-shrink-0 text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-0.5">
                        {ing.portion}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Why this meal */}
            {activeSuggestion.reason && (
              <div className="p-4 bg-primary-50/50">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1">
                  Why this meal
                </h4>
                <p className="text-sm text-gray-700">{activeSuggestion.reason}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
