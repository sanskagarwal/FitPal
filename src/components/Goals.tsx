import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, TrendingUp, Sparkles } from 'lucide-react';
import { suggestGoals } from '../services/openai';
import { calculateAge } from '../utils/helpers';
import { getWeightsByUser } from '../utils/db';
import { Spinner, LoadingBlock } from './Spinner';

export const Goals = () => {
  const { user, updateGoals } = useAuth();
  const [formData, setFormData] = useState({
    targetWeight: user?.profile.goals.targetWeight || 0,
    weightLossRate: user?.profile.goals.weightLossRate || 0.5,
    targetCalories: user?.profile.goals.targetCalories || 2000,
    targetProtein: user?.profile.goals.targetProtein || 150,
    targetCarbs: user?.profile.goals.targetCarbs || 250,
    targetFats: user?.profile.goals.targetFats || 65,
    targetFiber: user?.profile.goals.targetFiber || 30,
    targetVitaminA: user?.profile.goals.targetVitaminA || 900,
    targetVitaminC: user?.profile.goals.targetVitaminC || 90,
    targetVitaminD: user?.profile.goals.targetVitaminD || 15,
    targetCalcium: user?.profile.goals.targetCalcium || 1000,
    targetIron: user?.profile.goals.targetIron || 18,
    targetMagnesium: user?.profile.goals.targetMagnesium || 400,
    targetPotassium: user?.profile.goals.targetPotassium || 3500,
  });
  const [loading, setLoading] = useState(false);
  const [gettingSuggestion, setGettingSuggestion] = useState(false);
  const [message, setMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    getWeightsByUser(user.id).then((weights) => {
      if (weights.length > 0) {
        setCurrentWeight(weights[0].weight);
      }
    });
  }, [user]);

  const handleGetAISuggestions = async () => {
    if (!user) return;

    if (currentWeight === null) {
      setMessage('Please log your current weight in the Weight Tracker first.');
      return;
    }

    setGettingSuggestion(true);
    setMessage('');
    setAiExplanation('');

    try {
      const suggestions = await suggestGoals(
        user.profile.height,
        currentWeight,
        calculateAge(user.profile.dateOfBirth),
        user.profile.gender,
        user.profile.activityLevel,
        formData.targetWeight
      );

      setFormData({
        ...formData,
        targetCalories: suggestions.calories,
        targetProtein: suggestions.protein,
        targetCarbs: suggestions.carbs,
        targetFats: suggestions.fats,
        targetFiber: suggestions.fiber,
      });
      setAiExplanation(suggestions.explanation);
      setMessage('AI suggestions loaded! Review and save if you like them.');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      setMessage('Failed to get AI suggestions. Please try again.');
    } finally {
      setGettingSuggestion(false);
    }
  };

  const calculateCaloriesFromWeightLoss = () => {
    if (!user) return;

    if (currentWeight === null) {
      setMessage('Please log your current weight in the Weight Tracker first.');
      return;
    }

    const weeklyDeficit = formData.weightLossRate * 7700;
    const dailyDeficit = weeklyDeficit / 7;

    const profile = user.profile;
    const age = calculateAge(profile.dateOfBirth);
    const bmr = profile.gender === 'male'
      ? 10 * currentWeight + 6.25 * profile.height - 5 * age + 5
      : 10 * currentWeight + 6.25 * profile.height - 5 * age - 161;

    const activityMultiplier = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very-active': 1.9
    }[profile.activityLevel] || 1.5;

    const maintenanceCalories = bmr * activityMultiplier;
    const targetCalories = Math.round(maintenanceCalories - dailyDeficit);

    const protein = Math.round(currentWeight * 1.8);
    const fats = Math.round((targetCalories * 0.25) / 9);
    const carbs = Math.round((targetCalories - (protein * 4) - (fats * 9)) / 4);

    setFormData({
      ...formData,
      targetCalories,
      targetProtein: protein,
      targetCarbs: carbs,
      targetFats: fats,
    });

    setMessage(`Goals calculated for ${formData.weightLossRate}kg/week weight loss!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateGoals(formData);
      setMessage('Goals updated successfully!');
    } catch (error) {
      setMessage('Error updating goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Your Goals</h1>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-8 h-8 text-primary-600" />
          <div>
            <h2 className="text-xl font-semibold">Set Your Nutrition & Fitness Goals</h2>
            <p className="text-sm text-gray-600">Customize your daily targets to match your objectives</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weight Goal and Loss Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Target Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.targetWeight}
                onChange={(e) => setFormData({ ...formData, targetWeight: parseFloat(e.target.value) })}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Your desired weight goal</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight Loss Rate (kg/week)
              </label>
              <select
                value={formData.weightLossRate}
                onChange={(e) => setFormData({ ...formData, weightLossRate: parseFloat(e.target.value) })}
                className="input-field"
              >
                <option value="0.25">0.25 kg/week (Slow & Steady)</option>
                <option value="0.5">0.5 kg/week (Moderate)</option>
                <option value="0.75">0.75 kg/week (Aggressive)</option>
                <option value="1">1 kg/week (Very Aggressive)</option>
              </select>
              <button
                type="button"
                onClick={calculateCaloriesFromWeightLoss}
                className="mt-2 text-sm btn-primary w-full"
              >
                Calculate Goals from Weight Loss Rate
              </button>
            </div>
          </div>

          {/* AI Suggestion Button */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">AI-Powered Goal Suggestions</h3>
              </div>
              <button
                type="button"
                onClick={handleGetAISuggestions}
                disabled={gettingSuggestion}
                className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
              >
                {gettingSuggestion && <Spinner className="w-4 h-4" />}
                {gettingSuggestion ? 'Getting Suggestions...' : 'Get AI Suggestions'}
              </button>
            </div>
            {gettingSuggestion ? (
              <div className="bg-white p-3 rounded">
                <LoadingBlock label="Crunching your profile and target to recommend goals…" />
              </div>
            ) : aiExplanation ? (
              <div className="bg-white p-3 rounded text-sm text-gray-700">
                {aiExplanation}
              </div>
            ) : (
              <p className="text-sm text-purple-700">
                Get personalized nutrition goals based on your profile using AI
              </p>
            )}
          </div>

          {/* Calorie Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Calories Target
            </label>
            <input
              type="number"
              value={formData.targetCalories}
              onChange={(e) => setFormData({ ...formData, targetCalories: parseInt(e.target.value) })}
              className="input-field"
              required
            />
            <p className="text-xs text-gray-600 mt-1">Recommended: 1800-2500 for most adults</p>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Protein (grams/day)
              </label>
              <input
                type="number"
                value={formData.targetProtein}
                onChange={(e) => setFormData({ ...formData, targetProtein: parseInt(e.target.value) })}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Builds muscle</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carbs (grams/day)
              </label>
              <input
                type="number"
                value={formData.targetCarbs}
                onChange={(e) => setFormData({ ...formData, targetCarbs: parseInt(e.target.value) })}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Energy source</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fats (grams/day)
              </label>
              <input
                type="number"
                value={formData.targetFats}
                onChange={(e) => setFormData({ ...formData, targetFats: parseInt(e.target.value) })}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-600 mt-1">Essential nutrients</p>
            </div>
          </div>

          {/* Micronutrients */}
          <div>
            <h3 className="font-semibold mb-3">Micronutrient Targets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fiber (g)</label>
                <input
                  type="number"
                  value={formData.targetFiber}
                  onChange={(e) => setFormData({ ...formData, targetFiber: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vitamin A (mcg)</label>
                <input
                  type="number"
                  value={formData.targetVitaminA}
                  onChange={(e) => setFormData({ ...formData, targetVitaminA: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vitamin C (mg)</label>
                <input
                  type="number"
                  value={formData.targetVitaminC}
                  onChange={(e) => setFormData({ ...formData, targetVitaminC: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vitamin D (mcg)</label>
                <input
                  type="number"
                  value={formData.targetVitaminD}
                  onChange={(e) => setFormData({ ...formData, targetVitaminD: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Calcium (mg)</label>
                <input
                  type="number"
                  value={formData.targetCalcium}
                  onChange={(e) => setFormData({ ...formData, targetCalcium: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Iron (mg)</label>
                <input
                  type="number"
                  value={formData.targetIron}
                  onChange={(e) => setFormData({ ...formData, targetIron: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Magnesium (mg)</label>
                <input
                  type="number"
                  value={formData.targetMagnesium}
                  onChange={(e) => setFormData({ ...formData, targetMagnesium: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Potassium (mg)</label>
                <input
                  type="number"
                  value={formData.targetPotassium}
                  onChange={(e) => setFormData({ ...formData, targetPotassium: parseInt(e.target.value) })}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') || message.includes('calculated') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Updating...' : 'Update Goals'}
          </button>
        </form>
      </div>

      {/* Helpful Tips */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100">
        <h3 className="font-semibold mb-3">💡 Tips for Setting Goals</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Slow & Steady (0.25kg/week):</strong> Best for sustainable weight loss, minimal muscle loss</li>
          <li>• <strong>Moderate (0.5kg/week):</strong> Balanced approach, recommended for most people</li>
          <li>• <strong>Aggressive (0.75-1kg/week):</strong> Faster results but requires strict adherence</li>
          <li>• For muscle gain: Increase protein to 1.6-2.2g per kg of body weight</li>
          <li>• Balance macros: 40% carbs, 30% protein, 30% fats is a good starting point</li>
          <li>• Micronutrients are essential! Don't neglect vitamins and minerals</li>
          <li>• Adjust goals based on your activity level and how your body responds</li>
          <li>• Be patient - sustainable change takes time!</li>
        </ul>
      </div>
    </div>
  );
};
