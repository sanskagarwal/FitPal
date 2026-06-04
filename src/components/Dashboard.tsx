import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MealEntry, DailyStats, WeightEntry, NutrientInfo } from '../types';
import { getMealsByDateRange, getWeightsByUser } from '../utils/db';
import { getStartOfDay, getEndOfDay, getStartOfWeek, getDaysInRange, formatNutrient, getGoalPercentage } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Target, Award, Calendar, AlertCircle, Sparkles, TrendingUp, Lightbulb, X } from 'lucide-react';
import { suggestMeal, suggestFoodForNutrient } from '../services/openai';
import ReactMarkdown from 'react-markdown';
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
  const [mealSuggestion, setMealSuggestion] = useState<string>('');
  const [suggestingMeal, setSuggestingMeal] = useState(false);
  const [nutrientSuggestion, setNutrientSuggestion] = useState<{nutrient: string, suggestion: string} | null>(null);
  const [suggestingNutrient, setSuggestingNutrient] = useState(false);

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
    setMealSuggestion('');

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
        remainingCalories,
        remainingProtein,
        remainingCarbs,
        remainingFats,
        remainingFiber,
        mealType
      );
      
      // Try to parse if it's JSON and format it nicely
      try {
        const parsed = JSON.parse(suggestion);
        const formatted = formatMealSuggestionFromJSON(parsed);
        setMealSuggestion(formatted);
      } catch {
        // Not JSON, use as is
        setMealSuggestion(suggestion);
      }
    } catch (error) {
      console.error('Error getting meal suggestion:', error);
      setMealSuggestion('Unable to get meal suggestion. Please try again.');
    } finally {
      setSuggestingMeal(false);
    }
  };

  const formatMealSuggestionFromJSON = (data: any): string => {
    let formatted = '';
    
    if (data.meal_suggestion) {
      formatted += `## ${data.meal_suggestion.name}\n\n`;
      
      if (data.meal_suggestion.ingredients) {
        formatted += '**Ingredients:**\n\n';
        data.meal_suggestion.ingredients.forEach((ing: any) => {
          formatted += `- **${ing.item}**: ${ing.portion}\n`;
        });
        formatted += '\n';
      }
    }
    
    if (data.nutritional_breakdown) {
      formatted += '**Nutritional Breakdown:**\n\n';
      const nutrients = data.nutritional_breakdown;
      formatted += `- **Calories**: ${nutrients.calories}\n`;
      formatted += `- **Protein**: ${nutrients.protein}\n`;
      formatted += `- **Carbs**: ${nutrients.carbohydrates}\n`;
      formatted += `- **Fats**: ${nutrients.fats}\n`;
      formatted += `- **Fiber**: ${nutrients.fiber}\n\n`;
    }
    
    if (data.meal_fit_justification) {
      formatted += '**Why This Meal?**\n\n';
      formatted += data.meal_fit_justification;
    }
    
    return formatted;
  };

  const handleNutrientSuggestion = async (nutrientName: string, currentAmount: number, targetAmount: number) => {
    if (!user) return;

    setSuggestingNutrient(true);
    setNutrientSuggestion(null);

    try {
      const suggestion = await suggestFoodForNutrient(nutrientName, currentAmount, targetAmount);
      
      // Try to parse if it's JSON and format it nicely
      try {
        const parsed = JSON.parse(suggestion);
        const formatted = formatNutrientSuggestionFromJSON(parsed, nutrientName);
        setNutrientSuggestion({ nutrient: nutrientName, suggestion: formatted });
      } catch {
        // Not JSON, use as is
        setNutrientSuggestion({ nutrient: nutrientName, suggestion });
      }
    } catch (error) {
      console.error('Error getting nutrient suggestion:', error);
      setNutrientSuggestion({ 
        nutrient: nutrientName, 
        suggestion: 'Unable to get suggestion. Please try again.' 
      });
    } finally {
      setSuggestingNutrient(false);
    }
  };

  const formatNutrientSuggestionFromJSON = (data: any, nutrientName: string): string => {
    let formatted = '';
    
    if (data.top_foods || data.foods) {
      const foods = data.top_foods || data.foods;
      formatted += `**Top ${nutrientName}-Rich Indian Foods:**\n\n`;
      
      if (Array.isArray(foods)) {
        foods.forEach((food: any) => {
          if (typeof food === 'string') {
            formatted += `- ${food}\n`;
          } else if (food.name && food.content) {
            formatted += `- **${food.name}**: ${food.content}\n`;
          } else if (food.item && food.portion) {
            formatted += `- **${food.item}** (${food.portion})\n`;
          }
        });
      }
      formatted += '\n';
    }
    
    if (data.portion_sizes) {
      formatted += '**Recommended Portions:**\n\n';
      if (Array.isArray(data.portion_sizes)) {
        data.portion_sizes.forEach((portion: any) => {
          formatted += `- ${portion}\n`;
        });
      } else if (typeof data.portion_sizes === 'string') {
        formatted += data.portion_sizes + '\n';
      }
      formatted += '\n';
    }
    
    if (data.meal_ideas || data.incorporation_tips) {
      formatted += '**How to Add to Your Meals:**\n\n';
      const tips = data.meal_ideas || data.incorporation_tips;
      if (Array.isArray(tips)) {
        tips.forEach((tip: any) => {
          formatted += `- ${tip}\n`;
        });
      } else if (typeof tips === 'string') {
        formatted += tips;
      }
    }
    
    return formatted;
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">AI Meal Suggestion</h2>
          </div>
          <button
            onClick={handleMealSuggestion}
            disabled={suggestingMeal}
            className="btn-primary flex items-center gap-2"
          >
            {suggestingMeal && <Spinner className="w-4 h-4" />}
            {suggestingMeal ? 'Generating...' : 'Get Suggestion'}
          </button>
        </div>
        {suggestingMeal ? (
          <div className="bg-white p-4 rounded-lg">
            <LoadingBlock label="Building a meal around your remaining goals…" />
          </div>
        ) : mealSuggestion ? (
          <div className="bg-white p-4 rounded-lg">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-800 mb-2 mt-3" {...props} />,
                  p: ({node, ...props}) => <p className="text-gray-700 mb-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside ml-2 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside ml-2 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                  em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                  code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                }}
              >
                {mealSuggestion}
              </ReactMarkdown>
            </div>
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
            <div className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Food Suggestions for {nutrientSuggestion.nutrient}</h3>
            </div>
            <button
              onClick={() => setNutrientSuggestion(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-semibold text-gray-800 mb-2 mt-3" {...props} />,
                  p: ({node, ...props}) => <p className="text-gray-700 mb-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside ml-2 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside ml-2 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                  em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                  code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                }}
              >
                {nutrientSuggestion.suggestion}
              </ReactMarkdown>
            </div>
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
