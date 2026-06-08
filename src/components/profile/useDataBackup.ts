import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ToastType } from '../Toast';
import {
  authMe,
  getMealsByUser,
  getNotificationSettings,
  getWeightsByUser,
} from '../../utils/db';
import {
  exportDataAsCSV,
  exportDataAsJSON,
  importDataFromJSON,
} from '../../utils/exportImport';

type ToastState = { message: string; type: ToastType } | null;

// Owns the Profile "Data & Backup" actions: exporting the signed-in user's data
// as JSON/CSV and restoring a JSON backup. All storage access goes through the
// existing db client, and the imported records are re-mapped to the current
// user server-side, so this never touches another account's data.
export const useDataBackup = () => {
  const { user, setUser } = useAuth();
  const [toast, setToast] = useState<ToastState>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportJSON = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const [meals, weights, notifications] = await Promise.all([
        getMealsByUser(user.id),
        getWeightsByUser(user.id),
        getNotificationSettings(user.id),
      ]);
      await exportDataAsJSON(user, meals, weights, notifications);
      setToast({ message: 'Backup downloaded as JSON.', type: 'success' });
    } catch (error) {
      console.error('Error exporting data as JSON:', error);
      setToast({ message: 'Could not export your data. Please try again.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const [meals, weights] = await Promise.all([
        getMealsByUser(user.id),
        getWeightsByUser(user.id),
      ]);
      await exportDataAsCSV(meals, weights);
      setToast({ message: 'Meals and weights exported as CSV.', type: 'success' });
    } catch (error) {
      console.error('Error exporting data as CSV:', error);
      setToast({ message: 'Could not export your data. Please try again.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // Open the native file picker. The actual work runs in `handleFileSelected`.
  const startImport = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again still fires onChange.
    event.target.value = '';
    if (!file || !user || importing) return;

    setImporting(true);
    try {
      const result = await importDataFromJSON(file, user.id);
      // The restore may have changed the profile/goals, so refresh the cached
      // auth user from the server to keep the rest of the app in sync.
      const refreshed = await authMe();
      if (refreshed) setUser(refreshed);
      setToast({
        message: `Restore complete: ${result.meals} meals and ${result.weights} weight entries imported.`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error importing data:', error);
      setToast({
        message: 'Could not restore this backup. Make sure it is a FitPal JSON export.',
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  return {
    toast,
    setToast,
    exporting,
    importing,
    fileInputRef,
    exportJSON,
    exportCSV,
    startImport,
    handleFileSelected,
  };
};
