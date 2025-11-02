import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Target, TrendingUp } from 'lucide-react';

export const Goals = () => {
  const { user, updateGoals } = useAuth();
  const [formData, setFormData] = useState({
    targetWeight: user?.profile.goals.targetWeight || 0,
    targetCalories: user?.profile.goals.targetCalories || 2000,
    targetProtein: user?.profile.goals.targetProtein || 150,
    targetCarbs: user?.profile.goals.targetCarbs || 250,
    targetFats: user?.profile.goals.targetFats || 65,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
          {/* Weight Goal */}
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

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
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
          <li>• For weight loss: Create a 300-500 calorie deficit from your maintenance calories</li>
          <li>• For muscle gain: Increase protein to 1.6-2.2g per kg of body weight</li>
          <li>• Balance macros: 40% carbs, 30% protein, 30% fats is a good starting point</li>
          <li>• Adjust goals based on your activity level and how your body responds</li>
          <li>• Be patient - sustainable change takes time!</li>
        </ul>
      </div>
    </div>
  );
};
