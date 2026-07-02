import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ToastType } from '../Toast';
import { BackupPreview, RestoreMode } from '../../types';
import { authMe, downloadBackup, restoreBackup } from '../../utils/db';
import { readBackupPreview } from '../../utils/exportImport';

type ToastState = { message: string; type: ToastType } | null;

export const useDataBackup = () => {
  const { setUser } = useAuth();
  const [toast, setToast] = useState<ToastState>(null);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedMode, setSelectedMode] = useState<RestoreMode>('merge');
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadBackup();
      // Refresh user so lastBackupAt updates in context immediately.
      const refreshed = await authMe();
      if (refreshed) setUser(refreshed);
      setToast({ message: 'Backup downloaded.', type: 'success' });
    } catch {
      setToast({ message: 'Could not download backup. Please try again.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const startRestore = () => {
    if (restoring) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || restoring) return;

    try {
      const manifest = await readBackupPreview(file);
      setPendingFile(file);
      setSelectedMode('merge');
      setPreview(manifest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read this file.';
      setToast({ message: msg, type: 'error' });
    }
  };

  const cancelRestore = () => {
    setPreview(null);
    setPendingFile(null);
    setSelectedMode('merge');
  };

  const confirmRestore = async () => {
    if (!pendingFile || restoring) return;
    setRestoring(true);
    try {
      const result = await restoreBackup(pendingFile, selectedMode);
      const refreshed = await authMe();
      if (refreshed) setUser(refreshed);
      const parts = [
        `${result.meals} meal${result.meals !== 1 ? 's' : ''}`,
        `${result.weightEntries} weight entr${result.weightEntries !== 1 ? 'ies' : 'y'}`,
        `${result.waterEntries} water entr${result.waterEntries !== 1 ? 'ies' : 'y'}`,
      ];
      if (result.images > 0) parts.push(`${result.images} photo${result.images !== 1 ? 's' : ''}`);
      setToast({ message: `Restore complete: ${parts.join(', ')}.`, type: 'success' });
    } catch {
      setToast({ message: 'Restore failed. Please try again.', type: 'error' });
    } finally {
      setRestoring(false);
      setPreview(null);
      setPendingFile(null);
      setSelectedMode('merge');
    }
  };

  return {
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
  };
};
