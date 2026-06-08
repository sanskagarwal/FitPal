import { AlertTriangle, Trash2 } from 'lucide-react';
import { CONFIRM_PHRASE, useDeleteAccount } from './useDeleteAccount';

// Profile "Danger Zone" card: lets a user permanently delete their account and
// all associated data. The destructive action is gated behind a confirmation
// dialog that requires the current password and typing a confirmation phrase.
export const DangerZoneCard = () => {
  const {
    open,
    password,
    setPassword,
    confirmText,
    setConfirmText,
    error,
    submitting,
    canSubmit,
    openDialog,
    closeDialog,
    confirmDelete,
  } = useDeleteAccount();

  return (
    <div className="card border border-red-200">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
        <div>
          <h2 className="text-xl font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-600">Irreversible actions for your account</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Delete account</h3>
          <p className="text-xs text-gray-500">
            Permanently remove your account and all meals, weights, and settings. This
            cannot be undone. Consider exporting a backup first.
          </p>
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="btn-danger flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Trash2 className="w-4 h-4" />
          Delete account
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 id="delete-account-title" className="text-lg font-semibold text-gray-900">
                Delete your account?
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This permanently deletes your account and all of your data. This action cannot
              be undone.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="delete-password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Current password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                />
              </div>

              <div>
                <label
                  htmlFor="delete-confirm"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type <span className="font-semibold">{CONFIRM_PHRASE}</span> to confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input-field"
                  placeholder={CONFIRM_PHRASE}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!canSubmit}
                className="btn-danger flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {submitting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
