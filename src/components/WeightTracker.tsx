import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { WeightEntry, Streak } from '../types';
import { saveWeight, getWeightsByUser, saveStreak, getStreak, updateWeight, deleteWeight } from '../utils/db';
import { generateId, calculateBMI, calculateStreak } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, Minus, Award, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';

export const WeightTracker = () => {
  const { user } = useAuth();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [streak, setStreakData] = useState<Streak | null>(null);
  const [newWeight, setNewWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editBodyFat, setEditBodyFat] = useState('');
  const [editNotes, setEditNotes] = useState('');

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

  const startEdit = (entry: WeightEntry) => {
    setEditingId(entry.id);
    setEditWeight(entry.weight.toString());
    setEditBodyFat(entry.bodyFat?.toString() || '');
    setEditNotes(entry.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWeight('');
    setEditBodyFat('');
    setEditNotes('');
  };

  const saveEdit = async (id: string) => {
    if (!user || !editWeight) return;

    setLoading(true);
    try {
      const weightValue = parseFloat(editWeight);
      const bodyFatValue = editBodyFat ? parseFloat(editBodyFat) : undefined;
      const bmi = calculateBMI(weightValue, user.profile.height);

      const originalEntry = weights.find(w => w.id === id);
      if (!originalEntry) return;

      const updatedEntry: WeightEntry = {
        ...originalEntry,
        weight: weightValue,
        bodyFat: bodyFatValue,
        bmi,
        notes: editNotes || undefined,
      };

      await updateWeight(updatedEntry);
      cancelEdit();
      await loadWeightData();
    } catch (error) {
      console.error('Error updating weight:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this weight entry?')) return;

    setLoading(true);
    try {
      await deleteWeight(id, user.id);
      await loadWeightData();

      // Update streak after deletion
      const allWeights = await getWeightsByUser(user.id);
      const dates = allWeights.map((w) => new Date(w.date));
      const currentStreak = calculateStreak(dates);
      
      const updatedStreak: Streak = {
        userId: user.id,
        currentStreak,
        longestStreak: streak?.longestStreak || 0,
        lastLogDate: allWeights[0] ? new Date(allWeights[0].date) : new Date(),
      };

      await saveStreak(updatedStreak);
      setStreakData(updatedStreak);
    } catch (error) {
      console.error('Error deleting weight:', error);
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
  const previousWeight = weights[1];
  const startWeight = weights[weights.length - 1];
  const targetWeight = user?.profile.goals.targetWeight || 0;

  // Change since the previous weigh-in
  const weightChange =
    latestWeight && previousWeight
      ? Number((latestWeight.weight - previousWeight.weight).toFixed(1))
      : null;

  // Progress from start weight toward the target weight (0-100%)
  let goalProgress: number | null = null;
  if (latestWeight && startWeight && targetWeight > 0) {
    const totalDistance = Math.abs(startWeight.weight - targetWeight);
    const remaining = Math.abs(latestWeight.weight - targetWeight);
    if (totalDistance === 0) {
      goalProgress = 100;
    } else {
      goalProgress = Math.max(0, Math.min(100, ((totalDistance - remaining) / totalDistance) * 100));
    }
  }

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
              {weightChange !== null && (
                <p
                  className={`text-sm font-medium flex items-center gap-1 mt-1 ${
                    weightChange < 0
                      ? 'text-green-600'
                      : weightChange > 0
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {weightChange < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : weightChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <Minus className="w-4 h-4" />
                  )}
                  {weightChange > 0 ? '+' : ''}
                  {weightChange} kg since last
                </p>
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
              {goalProgress !== null && (
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{Math.round(goalProgress)}% to goal</p>
                </div>
              )}
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
              onKeyDown={(e) => e.key === 'Enter' && newWeight && !loading && logWeight()}
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
              onKeyDown={(e) => e.key === 'Enter' && newWeight && !loading && logWeight()}
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
              onKeyDown={(e) => e.key === 'Enter' && newWeight && !loading && logWeight()}
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
      {weights.length > 0 ? (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Weight Progress</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} unit=" kg" width={70} />
              <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
              {targetWeight > 0 && (
                <ReferenceLine
                  y={targetWeight}
                  stroke="#f59e0b"
                  strokeDasharray="6 4"
                  label={{ value: `Target ${targetWeight} kg`, position: 'insideTopRight', fill: '#b45309', fontSize: 12 }}
                />
              )}
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
      ) : (
        <div className="card text-center py-12">
          <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">No weigh-ins yet</h2>
          <p className="text-sm text-gray-500">Log your first weight above to start tracking your progress.</p>
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
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {weights.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    {editingId === entry.id ? (
                      <>
                        <td className="px-4 py-3 text-sm">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            step="0.1"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(entry.id);
                              else if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {calculateBMI(parseFloat(editWeight) || 0, user?.profile.height || 170)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="number"
                            step="0.1"
                            value={editBodyFat}
                            onChange={(e) => setEditBodyFat(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(entry.id);
                              else if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(entry.id);
                              else if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-32 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Notes"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(entry.id)}
                              disabled={loading}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={loading}
                              className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{entry.weight} kg</td>
                        <td className="px-4 py-3 text-sm">{entry.bmi}</td>
                        <td className="px-4 py-3 text-sm">{entry.bodyFat ? `${entry.bodyFat}%` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entry.notes || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(entry)}
                              disabled={loading}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
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
