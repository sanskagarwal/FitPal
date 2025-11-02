import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WeightEntry, Streak } from '../types';
import { saveWeight, getWeightsByUser, saveStreak, getStreak } from '../utils/db';
import { generateId, calculateBMI, calculateStreak } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, Award, Calendar } from 'lucide-react';

export const WeightTracker = () => {
  const { user } = useAuth();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [streak, setStreakData] = useState<Streak | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWeightData();
  }, [user]);

  const loadWeightData = async () => {
    if (!user) return;

    const weightData = await getWeightsByUser(user.id);
    setWeights(weightData);

    const streakData = await getStreak(user.id);
    if (streakData) {
      setStreakData(streakData);
    } else {
      const initialStreak: Streak = {
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
        lastLogDate: new Date(),
      };
      await saveStreak(initialStreak);
      setStreakData(initialStreak);
    }
  };

  const logWeight = async () => {
    if (!user || !newWeight) return;

    setLoading(true);
    try {
      const weightValue = parseFloat(newWeight);
      const bodyFatValue = bodyFat ? parseFloat(bodyFat) : undefined;
      const bmi = calculateBMI(weightValue, user.profile.height);

      const entry: WeightEntry = {
        id: generateId(),
        userId: user.id,
        date: new Date(),
        weight: weightValue,
        bodyFat: bodyFatValue,
        bmi,
        notes: notes || undefined,
      };

      await saveWeight(entry);

      // Update streak
      const allWeights = await getWeightsByUser(user.id);
      const dates = allWeights.map((w) => new Date(w.date));
      const currentStreak = calculateStreak(dates);
      const longestStreak = Math.max(streak?.longestStreak || 0, currentStreak);

      const updatedStreak: Streak = {
        userId: user.id,
        currentStreak,
        longestStreak,
        lastLogDate: new Date(),
      };

      await saveStreak(updatedStreak);
      setStreakData(updatedStreak);

      // Reset form
      setNewWeight('');
      setBodyFat('');
      setNotes('');

      await loadWeightData();
    } catch (error) {
      console.error('Error logging weight:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = weights
    .slice(0, 30)
    .reverse()
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: entry.weight,
      bmi: entry.bmi,
    }));

  const latestWeight = weights[0];
  const targetWeight = user?.profile.goals.targetWeight || 0;
  const progress = latestWeight ? ((latestWeight.weight - targetWeight) / latestWeight.weight) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Weight Tracker</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Current Weight</p>
              <p className="text-3xl font-bold text-gray-900">
                {latestWeight ? `${latestWeight.weight} kg` : 'N/A'}
              </p>
              {latestWeight && (
                <p className="text-sm text-gray-600">BMI: {latestWeight.bmi}</p>
              )}
            </div>
            <TrendingDown className="w-12 h-12 text-primary-600" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Target Weight</p>
              <p className="text-3xl font-bold text-gray-900">{targetWeight} kg</p>
              <p className="text-sm text-gray-600">
                {latestWeight ? `${Math.abs(latestWeight.weight - targetWeight).toFixed(1)} kg to go` : ''}
              </p>
            </div>
            <Award className="w-12 h-12 text-amber-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 font-medium">Current Streak</p>
              <p className="text-3xl font-bold text-gray-900">{streak?.currentStreak || 0} days</p>
              <p className="text-sm text-gray-600">Longest: {streak?.longestStreak || 0} days</p>
            </div>
            <Calendar className="w-12 h-12 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Log Weight Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Log Your Weight</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="input-field"
              placeholder="e.g., 70.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Fat % (optional)
            </label>
            <input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="input-field"
              placeholder="e.g., 18.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="Feeling great!"
            />
          </div>
        </div>
        <button
          onClick={logWeight}
          disabled={!newWeight || loading}
          className="btn-primary mt-4"
        >
          {loading ? 'Logging...' : 'Log Weight'}
        </button>
      </div>

      {/* Weight Progress Chart */}
      {weights.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Weight Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2}
                name="Weight (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weight History */}
      {weights.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Weight History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Weight</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">BMI</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Body Fat</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {weights.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.weight} kg</td>
                    <td className="px-4 py-3 text-sm">{entry.bmi}</td>
                    <td className="px-4 py-3 text-sm">{entry.bodyFat ? `${entry.bodyFat}%` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
