import { useState, useEffect, useCallback } from 'react';
import { WeightEntry, Streak, User } from '../../types';
import { saveWeight, getWeightsByUser, saveStreak, getStreak, updateWeight, deleteWeight } from '../../utils/db';
import { generateId, calculateBMI, calculateStreak } from '../../utils/helpers';
import { calculateGoalProgress } from '../../utils/weight';

// Owns weight history, the log form, inline editing, and the logging streak.
// Wraps the existing db calls only.
export const useWeightTracker = (user: User | null) => {
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

  const loadWeightData = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWeightData();
  }, [loadWeightData]);

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

  const goalProgress = calculateGoalProgress(startWeight?.weight, latestWeight?.weight, targetWeight);

  return {
    weights,
    streak,
    loading,
    newWeight,
    setNewWeight,
    bodyFat,
    setBodyFat,
    notes,
    setNotes,
    editingId,
    editWeight,
    setEditWeight,
    editBodyFat,
    setEditBodyFat,
    editNotes,
    setEditNotes,
    logWeight,
    startEdit,
    cancelEdit,
    saveEdit,
    handleDelete,
    chartData,
    latestWeight,
    weightChange,
    targetWeight,
    goalProgress,
  };
};
