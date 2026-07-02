import { AlertTriangle, Database, Download, Upload } from 'lucide-react';
import { Toast } from '../Toast';
import { useAuth } from '../../context/AuthContext';
import { useDataBackup } from './useDataBackup';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function lastBackupLabel(lastBackupAt: string | null | undefined): string {
  if (!lastBackupAt) return 'Never backed up';
  const days = daysSince(lastBackupAt);
  if (days === 0) return 'Last backup: today';
  if (days === 1) return 'Last backup: yesterday';
  return `Last backup: ${days} days ago`;
}

const WARN_DAYS = 30;

export const DataManagementCard = () => {
  const { user } = useAuth();
  const {
    toast,
    setToast,
    exporting,
    restoring,
    preview,
    selectedMode,
    setSelectedMode,
    fileInputRef,
    exportBackup,
    startRestore,
    handleFileSelected,
    confirmRestore,
    cancelRestore,
  } = useDataBackup();

  return (
    <div className="card">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-primary-600 dark:text-primary-400 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold">Data &amp; Backup</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Export your data for safekeeping or restore it from a backup
            </p>
          </div>
        </div>
        {(() => {
          const warn = !user?.lastBackupAt ||
            daysSince(user.lastBackupAt) > WARN_DAYS;
          return (
            <span className={`shrink-0 mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              warn
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {lastBackupLabel(user?.lastBackupAt)}
            </span>
          );
        })()}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Download a complete backup of your meals, weights, water entries, photos, and
            settings. You can restore it later on any account.
          </p>
          <button
            type="button"
            onClick={exportBackup}
            disabled={exporting}
            className="btn-outline flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Downloading...' : 'Download backup'}
          </button>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Restore
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Restore a FitPal ZIP backup. You will be able to preview the contents and choose
            how to apply them before any data is changed.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={startRestore}
            disabled={restoring}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {restoring ? 'Restoring...' : 'Restore from backup'}
          </button>
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              <h3 id="restore-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Restore backup?
              </h3>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Backup from {formatDate(preview.exportedAt)}
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">v{preview.version}</span>
            </p>

            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 mb-4 text-sm text-gray-700 dark:text-gray-200 space-y-1">
              <p>
                <span className="font-medium">{preview.meals}</span> meal{preview.meals !== 1 ? 's' : ''}
                {preview.mealsWithPhotos > 0 && (
                  <span className="text-gray-500 dark:text-gray-400"> ({preview.mealsWithPhotos} with photos)</span>
                )}
              </p>
              <p><span className="font-medium">{preview.weightEntries}</span> weight entr{preview.weightEntries !== 1 ? 'ies' : 'y'}</p>
              <p><span className="font-medium">{preview.waterEntries}</span> water entr{preview.waterEntries !== 1 ? 'ies' : 'y'}</p>
            </div>

            <fieldset className="mb-4">
              <legend className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Restore mode
              </legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMode('merge')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedMode === 'merge'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  Merge
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('replace')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedMode === 'replace'
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  Replace
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {selectedMode === 'merge'
                  ? 'Adds new records and updates matching ones. Your existing data is preserved.'
                  : 'Deletes all your current data for each type, then inserts from the backup.'}
              </p>
            </fieldset>

            {selectedMode === 'replace' && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  Replace permanently deletes all your current meals, weights, water entries,
                  photos, and settings before restoring. This cannot be undone.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelRestore}
                disabled={restoring}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                disabled={restoring}
                className={selectedMode === 'replace' ? 'btn-danger flex items-center justify-center gap-2' : 'btn-primary flex items-center justify-center gap-2'}
              >
                <Upload className="w-4 h-4" />
                {restoring
                  ? 'Restoring...'
                  : selectedMode === 'replace'
                  ? 'I understand, replace my data'
                  : 'Merge backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
