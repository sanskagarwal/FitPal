import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MealEntry, DailyStats, WeightEntry, NutrientInfo } from '../types';
import { getMealsByDateRange, getWeightsByUser } from '../utils/db';
import { getStartOfDay, getEndOfDay, getStartOfWeek, getDaysInRange, formatNutrient, getGoalPercentage } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Target, Award, Calendar, AlertCircle, Sparkles, TrendingUp, Lightbulb, X, UtensilsCrossed } from 'lucide-react';
import { suggestMeal, suggestFoodForNutrient, MealSuggestion, NutrientSuggestion } from '../services/openai';
import { Spinner, LoadingBlock } from './Spinner';

interface MealTypeStats {
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [recentWeight, setRecentWeight] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [mealSuggestion, setMealSuggestion] = useState<MealSuggestion | null>(null);
  const [suggestingMeal, setSuggestingMeal] = useState(false);
  const [nutrientSuggestion, setNutrientSuggestion] = useState<NutrientSuggestion | null>(null);
  const [suggestingNutrient, setSuggestingNutrient] = useState(false);
  const [dietPreference, setDietPreference] = useState<'vegetarian' | 'eggetarian' | 'non-vegetarian'>(
    user?.profile.dietPreference || 'vegetarian'
  );

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date();
      const startOfToday = getStartOfDay(today);
      const endOfToday = getEndOfDay(today);
      const startOfWeek = getStartOfWeek(today);

      // Load today's meals
      const meals = await getMealsByDateRange(user.id, startOfToday, endOfToday);
      setTodayMeals(meals);
      const todayTotals = calculateTotals(meals);
      setTodayStats({
        date: today,
        ...todayTotals,
        mealsLogged: meals.length,
      });

      // Load weekly data
      const weekDays = getDaysInRange(startOfWeek, today);
      const weeklyStats: DailyStats[] = [];
      
      for (const day of weekDays) {
        const dayStart = getStartOfDay(day);
        const dayEnd = getEndOfDay(day);
        const dayMeals = await getMealsByDateRange(user.id, dayStart, dayEnd);
        const dayTotals = calculateTotals(dayMeals);
        weeklyStats.push({
          date: day,
          ...dayTotals,
          mealsLogged: dayMeals.length,
        });
      }
      setWeeklyData(weeklyStats);

      // Load recent weight
      const weights = await getWeightsByUser(user.id);
      if (weights.length > 0) {
        setRecentWeight(weights[0]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (meals: MealEntry[]) => {
    return meals.reduce(
      (acc, meal) => ({
        totalCalories: acc.totalCalories + meal.totalNutrients.calories,
        totalProtein: acc.totalProtein + meal.totalNutrients.protein,
        totalCarbs: acc.totalCarbs + meal.totalNutrients.carbs,
        totalFats: acc.totalFats + meal.totalNutrients.fats,
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
    );
  };

  const getMealTypeStats = (): MealTypeStats[] => {
    const mealTypes = ['breakfast', 'morning-snack', 'lunch', 'evening-snack', 'dinner'];
    return mealTypes.map(mealType => {
      const mealsOfType = todayMeals.filter(m => m.mealType === mealType);
      const totals = mealsOfType.reduce((acc, meal) => ({
        calories: acc.calories + meal.totalNutrients.calories,
        protein: acc.protein + meal.totalNutrients.protein,
        carbs: acc.carbs + meal.totalNutrients.carbs,
        fats: acc.fats + meal.totalNutrients.fats,
        fiber: acc.fiber + (meal.totalNutrients.fiber || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });
      
      return {
        mealType: mealType.replace('-', ' '),
        ...totals
      };
    }).filter(stat => stat.calories > 0);
  };

  const getTotalMicronutrients = (): Partial<NutrientInfo> => {
    return todayMeals.reduce<Partial<NutrientInfo>>((acc, meal) => ({
      fiber: (acc.fiber || 0) + (meal.totalNutrients.fiber || 0),
      vitaminA: (acc.vitaminA || 0) + (meal.totalNutrients.vitaminA || 0),
      vitaminC: (acc.vitaminC || 0) + (meal.totalNutrients.vitaminC || 0),
      vitaminD: (acc.vitaminD || 0) + (meal.totalNutrients.vitaminD || 0),
      calcium: (acc.calcium || 0) + (meal.totalNutrients.calcium || 0),
      iron: (acc.iron || 0) + (meal.totalNutrients.iron || 0),
      magnesium: (acc.magnesium || 0) + (meal.totalNutrients.magnesium || 0),
      potassium: (acc.potassium || 0) + (meal.totalNutrients.potassium || 0),
    }), {});
  };

  const getMotivationalMessage = () => {
    if (!todayStats || !user) return null;
    
    const goals = user.profile.goals;
    const caloriePercent = (todayStats.totalCalories / goals.targetCalories) * 100;
    
    if (caloriePercent > 120) {
      return {
        type: 'warning',
        icon: AlertCircle,
        message: `You're ${Math.round(caloriePercent - 100)}% over your calorie goal. Consider lighter meals for the rest of the day! 💪`,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
      };
    } else if (caloriePercent > 100) {
      return {
        type: 'caution',
        icon: AlertCircle,
        message: `You've reached your calorie goal! Great job tracking. Keep it balanced! 🎯`,
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-800',
        iconColor: 'text-amber-600'
      };
    } else if (caloriePercent >= 80) {
      return {
        type: 'success',
        icon: TrendingUp,
        message: `You're on track! ${Math.round(100 - caloriePercent)}% of calories remaining. Keep going! 🌟`,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600'
      };
    } else {
      return {
        type: 'info',
        icon: Sparkles,
        message: `Great start! You have plenty of room for nutritious meals today. Stay consistent! ✨`,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      };
    }
  };

  const handleMealSuggestion = async () => {
    if (!user || !todayStats) return;

    setSuggestingMeal(true);
    setMealSuggestion(null);

    const goals = user.profile.goals;
    const remainingCalories = goals.targetCalories - todayStats.totalCalories;
    const remainingProtein = goals.targetProtein - todayStats.totalProtein;
    const remainingCarbs = goals.targetCarbs - todayStats.totalCarbs;
    const remainingFats = goals.targetFats - todayStats.totalFats;
    const remainingFiber = (goals.targetFiber || 30) - (getTotalMicronutrients().fiber || 0);

    // Determine which meal type to suggest
    const currentHour = new Date().getHours();
    let mealType = 'dinner';
    if (currentHour < 10) mealType = 'breakfast';
    else if (currentHour < 12) mealType = 'morning snack';
    else if (currentHour < 15) mealType = 'lunch';
    else if (currentHour < 18) mealType = 'evening snack';

    try {
      const suggestion = await suggestMeal(
        Math.round(remainingCalories),
        Math.round(remainingProtein),
        Math.round(remainingCarbs),
        Math.round(remainingFats),
        Math.round(remainingFiber),
        mealType,
        dietPreference
      );
      setMealSuggestion(suggestion);
    } catch (error) {
      console.error('Error getting meal suggestion:', error);
    } finally {
      setSuggestingMeal(false);
    }
  };

  const handleNutrientSuggestion = async (nutrientName: string, currentAmount: number, targetAmount: number) => {
    if (!user) return;

    setSuggestingNutrient(true);
    setNutrientSuggestion(null);

    try {
      const suggestion = await suggestFoodForNutrient(nutrientName, currentAmount, targetAmount);
      setNutrientSuggestion(suggestion);
    } catch (error) {
      console.error('Error getting nutrient suggestion:', error);
    } finally {
      setSuggestingNutrient(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const goals = user?.profile.goals;
  const caloriePercentage = todayStats ? getGoalPercentage(todayStats.totalCalories, goals?.targetCalories || 2000) : 0;
  const proteinPercentage = todayStats ? getGoalPercentage(todayStats.totalProtein, goals?.targetProtein || 150) : 0;
  const carbsPercentage = todayStats ? getGoalPercentage(todayStats.totalCarbs, goals?.targetCarbs || 250) : 0;
  const fatsPercentage = todayStats ? getGoalPercentage(todayStats.totalFats, goals?.targetFats || 65) : 0;

  const macroData = [
    { name: 'Protein', value: todayStats?.totalProtein || 0, color: '#ef4444' },
    { name: 'Carbs', value: todayStats?.totalCarbs || 0, color: '#3b82f6' },
    { name: 'Fats', value: todayStats?.totalFats || 0, color: '#f59e0b' },
  ];

  const weeklyChartData = weeklyData.map(day => ({
    date: day.date.toLocaleDateString('en-US', { weekday: 'short' }),
    calories: day.totalCalories,
    protein: day.totalProtein,
    carbs: day.totalCarbs,
    fats: day.totalFats,
  }));

  const motivationalMsg = getMotivationalMessage();
  const mealTypeStats = getMealTypeStats();
  const micronutrients = getTotalMicronutrients();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Motivational Message */}
      {motivationalMsg && (
        <div className={`card ${motivationalMsg.bgColor} ${motivationalMsg.borderColor} border`}>
          <div className="flex items-center gap-3">
            <motivationalMsg.icon className={`w-6 h-6 ${motivationalMsg.iconColor}`} />
            <p className={`${motivationalMsg.textColor} font-medium`}>{motivationalMsg.message}</p>
          </div>
        </div>
      )}

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Calories</p>
              <p className="text-2xl font-bold text-gray-900">
                {todayStats?.totalCalories || 0}
              </p>
              <p className="text-xs text-gray-600">of {goals?.targetCalories || 2000}</p>
            </div>
            <Target className="w-10 h-10 text-primary-600" />
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Protein</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNutrient(todayStats?.totalProtein, 'g')}
              </p>
              <p className="text-xs text-gray-600">of {goals?.targetProtein || 150}g</p>
            </div>
            <Award className="w-10 h-10 text-red-500" />
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
            ></div>
          </div>
          <button
            onClick={() => handleNutrientSuggestion('Protein', todayStats?.totalProtein || 0, goals?.targetProtein || 150)}
            disabled={suggestingNutrient}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            Suggest Foods
          </button>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Carbs</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNutrient(todayStats?.totalCarbs, 'g')}
              </p>
              <p className="text-xs text-gray-600">of {goals?.targetCarbs || 250}g</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-500" />
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(carbsPercentage, 100)}%` }}
            ></div>
          </div>
          <button
            onClick={() => handleNutrientSuggestion('Carbs', todayStats?.totalCarbs || 0, goals?.targetCarbs || 250)}
            disabled={suggestingNutrient}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            Suggest Foods
          </button>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Fats</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNutrient(todayStats?.totalFats, 'g')}
              </p>
              <p className="text-xs text-gray-600">of {goals?.targetFats || 65}g</p>
            </div>
            <TrendingDown className="w-10 h-10 text-amber-500" />
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(fatsPercentage, 100)}%` }}
            ></div>
          </div>
          <button
            onClick={() => handleNutrientSuggestion('Fats', todayStats?.totalFats || 0, goals?.targetFats || 65)}
            disabled={suggestingNutrient}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3" />
            Suggest Foods
          </button>
        </div>
      </div>

      {/* AI Meal Suggestion */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">AI Meal Suggestion</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dietPreference}
              onChange={(e) => setDietPreference(e.target.value as any)}
              disabled={suggestingMeal}
              className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label="Dietary preference"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="eggetarian">Eggetarian</option>
              <option value="non-vegetarian">Non-vegetarian</option>
            </select>
            <button
              onClick={handleMealSuggestion}
              disabled={suggestingMeal}
              className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {suggestingMeal && <Spinner className="w-4 h-4" />}
              {suggestingMeal ? 'Generating...' : 'Get Suggestion'}
            </button>
          </div>
        </div>
        {suggestingMeal ? (
          <div className="bg-white p-4 rounded-lg">
            <LoadingBlock label="Building a meal around your remaining goals…" />
          </div>
        ) : mealSuggestion ? (
          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            {/* Meal header */}
            <div className="flex items-start gap-3 p-4 border-b border-gray-100">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block text-[11px] font-medium uppercase tracking-wide text-primary-600 capitalize">
                  {mealSuggestion.mealType}
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug break-words">
                  {mealSuggestion.name}
                </h3>
                {mealSuggestion.description && (
                  <p className="text-sm text-gray-600 mt-0.5">{mealSuggestion.description}</p>
                )}
              </div>
              <button
                onClick={() => setMealSuggestion(null)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-700"
                aria-label="Dismiss suggestion"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nutrition pills */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4 border-b border-gray-100">
              {[
                { label: 'Calories', value: mealSuggestion.nutrition.calories, unit: '', color: 'text-gray-900' },
                { label: 'Protein', value: mealSuggestion.nutrition.protein, unit: 'g', color: 'text-red-600' },
                { label: 'Carbs', value: mealSuggestion.nutrition.carbs, unit: 'g', color: 'text-blue-600' },
                { label: 'Fats', value: mealSuggestion.nutrition.fats, unit: 'g', color: 'text-amber-600' },
                { label: 'Fiber', value: mealSuggestion.nutrition.fiber, unit: 'g', color: 'text-purple-600' },
              ].map((m) => (
                <div key={m.label} className="text-center bg-gray-50 rounded-lg py-2 px-1">
                  <p className={`text-base sm:text-lg font-bold ${m.color}`}>{m.value}{m.unit}</p>
                  <p className="text-[11px] text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Ingredients */}
            {mealSuggestion.ingredients.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  What's in it
                </h4>
                <ul className="space-y-1.5">
                  {mealSuggestion.ingredients.map((ing, i) => (
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
            {mealSuggestion.reason && (
              <div className="p-4 bg-primary-50/50">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1">
                  Why this meal
                </h4>
                <p className="text-sm text-gray-700">{mealSuggestion.reason}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">
            Click the button to get an AI-powered meal suggestion based on your remaining daily goals!
          </p>
        )}
      </div>

      {/* Meal Breakdown */}
      {mealTypeStats.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Today's Meal Breakdown</h2>
          <div className="space-y-3">
            {mealTypeStats.map((stat) => (
              <div key={stat.mealType} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 capitalize mb-2">{stat.mealType}</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Calories:</span>
                    <span className="ml-1 font-semibold">{Math.round(stat.calories)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Protein:</span>
                    <span className="ml-1 font-semibold">{Math.round(stat.protein)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Carbs:</span>
                    <span className="ml-1 font-semibold">{Math.round(stat.carbs)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fats:</span>
                    <span className="ml-1 font-semibold">{Math.round(stat.fats)}g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Fiber:</span>
                    <span className="ml-1 font-semibold">{Math.round(stat.fiber)}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Micronutrients */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Today's Micronutrients</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Fiber</p>
            <p className="text-xl font-bold text-purple-600">{Math.round(micronutrients.fiber || 0)}g</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetFiber || 30}g</p>
            <button
              onClick={() => handleNutrientSuggestion('Fiber', micronutrients.fiber || 0, goals?.targetFiber || 30)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600">Vitamin A</p>
            <p className="text-xl font-bold text-orange-600">{Math.round(micronutrients.vitaminA || 0)}mcg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetVitaminA || 900}mcg</p>
            <button
              onClick={() => handleNutrientSuggestion('Vitamin A', micronutrients.vitaminA || 0, goals?.targetVitaminA || 900)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Vitamin C</p>
            <p className="text-xl font-bold text-green-600">{Math.round(micronutrients.vitaminC || 0)}mg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetVitaminC || 90}mg</p>
            <button
              onClick={() => handleNutrientSuggestion('Vitamin C', micronutrients.vitaminC || 0, goals?.targetVitaminC || 90)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600">Vitamin D</p>
            <p className="text-xl font-bold text-yellow-600">{Math.round(micronutrients.vitaminD || 0)}mcg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetVitaminD || 15}mcg</p>
            <button
              onClick={() => handleNutrientSuggestion('Vitamin D', micronutrients.vitaminD || 0, goals?.targetVitaminD || 15)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Calcium</p>
            <p className="text-xl font-bold text-blue-600">{Math.round(micronutrients.calcium || 0)}mg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetCalcium || 1000}mg</p>
            <button
              onClick={() => handleNutrientSuggestion('Calcium', micronutrients.calcium || 0, goals?.targetCalcium || 1000)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Iron</p>
            <p className="text-xl font-bold text-red-600">{Math.round(micronutrients.iron || 0)}mg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetIron || 18}mg</p>
            <button
              onClick={() => handleNutrientSuggestion('Iron', micronutrients.iron || 0, goals?.targetIron || 18)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm text-gray-600">Magnesium</p>
            <p className="text-xl font-bold text-indigo-600">{Math.round(micronutrients.magnesium || 0)}mg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetMagnesium || 400}mg</p>
            <button
              onClick={() => handleNutrientSuggestion('Magnesium', micronutrients.magnesium || 0, goals?.targetMagnesium || 400)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg">
            <p className="text-sm text-gray-600">Potassium</p>
            <p className="text-xl font-bold text-pink-600">{Math.round(micronutrients.potassium || 0)}mg</p>
            <p className="text-xs text-gray-500">Target: {goals?.targetPotassium || 3500}mg</p>
            <button
              onClick={() => handleNutrientSuggestion('Potassium', micronutrients.potassium || 0, goals?.targetPotassium || 3500)}
              disabled={suggestingNutrient}
              className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Suggest
            </button>
          </div>
        </div>
      </div>

      {/* Nutrient Suggestion Display */}
      {suggestingNutrient && !nutrientSuggestion && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Finding food suggestions…</h3>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <LoadingBlock label="Looking up Indian foods rich in this nutrient…" />
          </div>
        </div>
      )}

      {nutrientSuggestion && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg font-semibold truncate">
                {nutrientSuggestion.nutrient}-rich foods
              </h3>
            </div>
            <button
              onClick={() => setNutrientSuggestion(null)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {nutrientSuggestion.foods.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {nutrientSuggestion.foods.map((food, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{food.name}</p>
                      {food.portion && (
                        <p className="text-xs text-gray-500">{food.portion}</p>
                      )}
                    </div>
                    {food.content && (
                      <span className="flex-shrink-0 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full px-2.5 py-1">
                        {food.content}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-sm text-gray-600">No specific foods returned.</p>
            )}

            {nutrientSuggestion.tips.length > 0 && (
              <div className="p-3 sm:p-4 bg-blue-50/50 border-t border-gray-100">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
                  Tips
                </h4>
                <ul className="space-y-1.5">
                  {nutrientSuggestion.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 flex-shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weight Progress */}
      {recentWeight && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Current Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Weight</p>
              <p className="text-2xl font-bold text-primary-600">{recentWeight.weight} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Target Weight</p>
              <p className="text-2xl font-bold text-gray-900">{goals?.targetWeight} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">BMI</p>
              <p className="text-2xl font-bold text-gray-900">{recentWeight.bmi}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">To Go</p>
              <p className="text-2xl font-bold text-amber-600">
                {Math.abs(recentWeight.weight - (goals?.targetWeight || 0)).toFixed(1)} kg
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Macro Distribution */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Today's Macro Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={macroData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {macroData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Trends */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Weekly Nutrition Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="calories" stroke="#10b981" name="Calories" />
            <Line type="monotone" dataKey="protein" stroke="#ef4444" name="Protein (g)" />
            <Line type="monotone" dataKey="carbs" stroke="#3b82f6" name="Carbs (g)" />
            <Line type="monotone" dataKey="fats" stroke="#f59e0b" name="Fats (g)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
