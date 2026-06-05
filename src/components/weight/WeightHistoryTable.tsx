import { Edit2, Trash2, Save, X } from 'lucide-react';
import { WeightEntry } from '../../types';
import { calculateBMI } from '../../utils/helpers';

interface WeightHistoryTableProps {
  weights: WeightEntry[];
  userHeight: number;
  loading: boolean;
  editingId: string | null;
  editWeight: string;
  setEditWeight: (value: string) => void;
  editBodyFat: string;
  setEditBodyFat: (value: string) => void;
  editNotes: string;
  setEditNotes: (value: string) => void;
  onStartEdit: (entry: WeightEntry) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export const WeightHistoryTable = ({
  weights,
  userHeight,
  loading,
  editingId,
  editWeight,
  setEditWeight,
  editBodyFat,
  setEditBodyFat,
  editNotes,
  setEditNotes,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: WeightHistoryTableProps) => {
  if (weights.length === 0) return null;

  const editKeyHandler = (id: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSaveEdit(id);
    else if (e.key === 'Escape') onCancelEdit();
  };

  return (
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
                        min="20"
                        max="500"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        onKeyDown={editKeyHandler(entry.id)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                        aria-label="Edit weight"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {calculateBMI(parseFloat(editWeight) || 0, userHeight)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={editBodyFat}
                        onChange={(e) => setEditBodyFat(e.target.value)}
                        onKeyDown={editKeyHandler(entry.id)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        placeholder="-"
                        aria-label="Edit body fat percentage"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        onKeyDown={editKeyHandler(entry.id)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Notes"
                        aria-label="Edit notes"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSaveEdit(entry.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          aria-label="Save changes"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onCancelEdit}
                          disabled={loading}
                          className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                          aria-label="Cancel editing"
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
                          onClick={() => onStartEdit(entry)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          aria-label="Edit weigh-in"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          aria-label="Delete weigh-in"
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
  );
};
