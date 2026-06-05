import { WeightEntry, UserGoals } from '../../types';

interface WeightProgressProps {
  recentWeight: WeightEntry | null;
  goals?: UserGoals;
}

export const WeightProgress = ({ recentWeight, goals }: WeightProgressProps) => {
  if (!recentWeight) return null;

  return (
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
  );
};
