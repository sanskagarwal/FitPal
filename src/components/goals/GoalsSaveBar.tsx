interface GoalsSaveBarProps {
  isDirty: boolean;
  loading: boolean;
  onSave: () => void;
  onReset: () => void;
}

// Persistent action bar pinned above the mobile bottom nav (and at the viewport
// bottom on desktop) so the save action is always visible. Buttons enable only
// when there are unsaved changes.
export const GoalsSaveBar = ({ isDirty, loading, onSave, onReset }: GoalsSaveBarProps) => (
  <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 px-safe md:bottom-0">
    <div className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 md:pb-4 lg:px-8">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <p
          className={`text-sm font-medium ${
            isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {isDirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!isDirty || loading}
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || loading}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
