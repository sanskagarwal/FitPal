import { useAuth } from '../context/AuthContext';
import { useWeightTracker } from './weight/useWeightTracker';
import { WeightStats } from './weight/WeightStats';
import { LogWeightForm } from './weight/LogWeightForm';
import { WeightChart } from './weight/WeightChart';
import { WeightHistoryTable } from './weight/WeightHistoryTable';

export const WeightTracker = () => {
  const { user } = useAuth();
  const wt = useWeightTracker(user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Weight Tracker</h1>

      <WeightStats
        latestWeight={wt.latestWeight}
        weightChange={wt.weightChange}
        targetWeight={wt.targetWeight}
        goalProgress={wt.goalProgress}
        streak={wt.streak}
      />

      <LogWeightForm
        newWeight={wt.newWeight}
        setNewWeight={wt.setNewWeight}
        bodyFat={wt.bodyFat}
        setBodyFat={wt.setBodyFat}
        notes={wt.notes}
        setNotes={wt.setNotes}
        loading={wt.loading}
        onLog={wt.logWeight}
      />

      <WeightChart
        hasWeights={wt.weights.length > 0}
        chartData={wt.chartData}
        targetWeight={wt.targetWeight}
      />

      <WeightHistoryTable
        weights={wt.weights}
        userHeight={user?.profile.height || 170}
        loading={wt.loading}
        editingId={wt.editingId}
        editWeight={wt.editWeight}
        setEditWeight={wt.setEditWeight}
        editBodyFat={wt.editBodyFat}
        setEditBodyFat={wt.setEditBodyFat}
        editNotes={wt.editNotes}
        setEditNotes={wt.setEditNotes}
        onStartEdit={wt.startEdit}
        onSaveEdit={wt.saveEdit}
        onCancelEdit={wt.cancelEdit}
        onDelete={wt.handleDelete}
      />
    </div>
  );
};
