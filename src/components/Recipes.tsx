import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Recipe, DietPreference } from '../types';
import { getRecipeSuggestions } from '../services/openai';
import { ChefHat, Clock, Users } from 'lucide-react';
import { Spinner } from './Spinner';

export const Recipes = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [preferences, setPreferences] = useState('');
  const [dietPreference, setDietPreference] = useState<DietPreference>(
    user?.profile.dietPreference || DietPreference.Vegetarian
  );
  const [error, setError] = useState<string | null>(null);

  // Re-sync the diet preference when the signed-in user's preference changes,
  // so a new user's preference isn't shadowed by the previous one's initial
  // value. React's recommended "adjust state during render" pattern.
  const [prevDietPreference, setPrevDietPreference] = useState(user?.profile.dietPreference);
  if (user?.profile.dietPreference !== prevDietPreference) {
    setPrevDietPreference(user?.profile.dietPreference);
    setDietPreference(user?.profile.dietPreference || DietPreference.Vegetarian);
  }

  const loadRecipes = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const goals = `Target: ${user.profile.goals.targetWeight}kg, ${user.profile.goals.targetCalories} cal/day`;
      const results = await getRecipeSuggestions(preferences, goals, [], dietPreference);
      setRecipes(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Recipe Suggestions</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <ChefHat className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold">Get AI-Powered Recipe Ideas</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dietPreference}
            onChange={(e) => setDietPreference(e.target.value as DietPreference)}
            className="input-field sm:w-48"
            aria-label="Dietary preference"
          >
            <option value={DietPreference.Vegetarian}>Vegetarian</option>
            <option value={DietPreference.Eggetarian}>Eggetarian</option>
            <option value={DietPreference.NonVegetarian}>Non-vegetarian</option>
          </select>
          <input
            type="text"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && loadRecipes()}
            placeholder="e.g., high protein, low carb, quick to make..."
            className="input-field flex-1"
            aria-label="Recipe preferences"
            autoFocus
          />
          <button
            onClick={loadRecipes}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading && <Spinner className="w-4 h-4" />}
            {loading ? 'Loading...' : 'Get Recipes'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Get personalized healthy Indian recipes based on your preferences and goals
        </p>
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">Error:</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}
      </div>

      {loading && recipes.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <ChefHat className="w-8 h-8 text-primary-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">{recipe.name}</h3>
                  <p className="text-sm text-gray-600">{recipe.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {recipe.prepTime}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {recipe.servings} servings
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Ingredients:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {recipe.ingredients.map((ingredient, idx) => (
                      <li key={idx}>• {ingredient}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Instructions:</h4>
                  <ol className="text-sm text-gray-700 space-y-1">
                    {recipe.instructions.map((instruction, idx) => (
                      <li key={idx}>{idx + 1}. {instruction}</li>
                    ))}
                  </ol>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h4 className="font-semibold text-sm mb-2">Nutrition (per serving):</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Calories:</span>
                      <span className="font-medium ml-2">{recipe.nutrients.calories}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Protein:</span>
                      <span className="font-medium ml-2">{recipe.nutrients.protein}g</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Carbs:</span>
                      <span className="font-medium ml-2">{recipe.nutrients.carbs}g</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fats:</span>
                      <span className="font-medium ml-2">{recipe.nutrients.fats}g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasSearched && recipes.length === 0 && (
        <div className="card text-center py-12">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">No recipes found</h2>
          <p className="text-sm text-gray-500">Try different preferences or a broader description.</p>
        </div>
      )}
    </div>
  );
};
