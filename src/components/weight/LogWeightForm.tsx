interface LogWeightFormProps {
  newWeight: string;
  setNewWeight: (value: string) => void;
  bodyFat: string;
  setBodyFat: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  loading: boolean;
  onLog: () => void;
}

export const LogWeightForm = ({
  newWeight,
  setNewWeight,
  bodyFat,
  setBodyFat,
  notes,
  setNotes,
  loading,
  onLog,
}: LogWeightFormProps) => {
  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newWeight && !loading) onLog();
  };

  return (
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
            min="20"
            max="500"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            onKeyDown={submitOnEnter}
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
            min="0"
            max="100"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            onKeyDown={submitOnEnter}
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
            onKeyDown={submitOnEnter}
            className="input-field"
            placeholder="Feeling great!"
          />
        </div>
      </div>
      <button
        onClick={onLog}
        disabled={!newWeight || loading}
        className="btn-primary mt-4"
      >
        {loading ? 'Logging...' : 'Log Weight'}
      </button>
    </div>
  );
};
