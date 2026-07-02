import { BackupPreview } from '../types';

// Parse a FitPal ZIP backup client-side to extract the manifest metadata needed
// to populate the pre-restore modal. Throws if the file is not a valid backup.
export const readBackupPreview = async (file: File): Promise<BackupPreview> => {
  const { default: JSZip } = await import('jszip');
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('Could not read the file as a ZIP archive');
  }

  const manifestFile = zip.file('backup.json');
  if (!manifestFile) {
    throw new Error('Invalid backup: missing backup.json');
  }

  const text = await manifestFile.async('text');
  const manifest = JSON.parse(text) as {
    version?: string;
    exportedAt?: string;
    meals?: unknown[];
    weightEntries?: unknown[];
    waterEntries?: unknown[];
    imageIndex?: unknown[];
  };

  if (!manifest.version || !manifest.exportedAt) {
    throw new Error('Invalid backup format');
  }

  return {
    version: manifest.version,
    exportedAt: manifest.exportedAt,
    meals: manifest.meals?.length ?? 0,
    mealsWithPhotos: manifest.imageIndex?.length ?? 0,
    weightEntries: manifest.weightEntries?.length ?? 0,
    waterEntries: manifest.waterEntries?.length ?? 0,
  };
};
