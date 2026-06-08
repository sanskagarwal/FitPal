import { Database, Download, FileJson, FileSpreadsheet, Upload } from 'lucide-react';
import { Toast } from '../Toast';
import { useDataBackup } from './useDataBackup';

// Profile "Data & Backup" card: export the signed-in user's data as JSON or CSV
// and restore a previously exported JSON backup. Wires the existing
// export/import utilities (src/utils/exportImport.ts) into the UI.
export const DataManagementCard = () => {
  const {
    toast,
    setToast,
    exporting,
    importing,
    fileInputRef,
    exportJSON,
    exportCSV,
    startImport,
    handleFileSelected,
  } = useDataBackup();

  return (
    <div className="card">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-xl font-semibold">Data &amp; Backup</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Export your data for safekeeping or restore it from a backup
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            JSON is a complete backup you can restore later. CSV is a spreadsheet-friendly
            copy of your meals and weights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={exportJSON}
              disabled={exporting}
              className="btn-outline flex items-center justify-center gap-2"
            >
              <FileJson className="w-4 h-4" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={exporting}
              className="btn-outline flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Restore
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Import a FitPal JSON backup. Existing entries with the same id are updated,
            and everything is restored to your account.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            type="button"
            onClick={startImport}
            disabled={importing}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import JSON backup'}
          </button>
        </div>
      </div>
    </div>
  );
};
