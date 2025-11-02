import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MealEntry, DailyStats, WeightEntry } from '../types';
import { getMealsByDateRange, getWeightsByUser } from '../utils/db';
import { getStartOfDay, getEndOfDay, getStartOfWeek, getDaysInRange, formatNutrient, getGoalPercentage } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Target, Award, Calendar } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [recentWeight, setRecentWeight] = useState<WeightEntry | null>(null);
  const [loading, setLoading] = useState(true);

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
      const todayMeals = await getMealsByDateRange(user.id, startOfToday, endOfToday);
      const todayTotals = calculateTotals(todayMeals);
      setTodayStats({
        date: today,
        ...todayTotals,
        mealsLogged: todayMeals.length,
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

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
        </div>
      </div>

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
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
