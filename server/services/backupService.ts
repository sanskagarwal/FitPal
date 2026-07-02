import JSZip from 'jszip';
import { NotFoundError } from '../errors.js';
import { userRepository } from '../repositories/userRepository.js';
import { mealRepository } from '../repositories/mealRepository.js';
import { weightRepository } from '../repositories/weightRepository.js';
import { waterRepository } from '../repositories/waterRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { streakRepository } from '../repositories/streakRepository.js';
import { nutritionRepository, type CachedNutrition } from '../repositories/nutritionRepository.js';
import { mealImageRepository, type UserMealImage } from '../repositories/mealImageRepository.js';

// ---------------------------------------------------------------------------
// Backup export.
//
// Collects every piece of a user's data (profile, meals, weights, water,
// notifications, streak, learned nutrition cache, meal photos) into one
// self-contained ZIP: a `backup.json` manifest plus an `images/` folder of the
// raw photo bytes, indexed by `imageIndex`.
// ---------------------------------------------------------------------------

export const BACKUP_VERSION = '1.0.0';

export interface UserBackup {
  name: string;
  email: string;
  createdAt: string;
  profile: unknown;
  lastBackupAt: string | null;
}

export interface StreakBackup {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string;
}

export interface NutritionCacheEntry {
  key: string;
  data: CachedNutrition;
}

export interface ImageIndexEntry {
  mealId: string;
  filename: string;
  mime: string;
}

export interface BackupManifest {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  user: UserBackup;
  meals: unknown[];
  weightEntries: unknown[];
  waterEntries: unknown[];
  notifications: unknown;
  streak: StreakBackup;
  nutritionCache: NutritionCacheEntry[];
  imageIndex: ImageIndexEntry[];
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionFor(mime: string): string {
  return MIME_EXTENSIONS[mime] ?? 'bin';
}

function gatherUserData(userId: string): { manifest: BackupManifest; images: UserMealImage[] } {
  const user = userRepository.findById(userId);
  if (!user) throw new NotFoundError('User');

  const images = mealImageRepository.listByUser(userId);
  const imageIndex: ImageIndexEntry[] = images.map((img) => ({
    mealId: img.mealId,
    filename: `meal-${img.mealId}.${extensionFor(img.mime)}`,
    mime: img.mime,
  }));

  const streak = streakRepository.get(userId);
  const notifications = notificationRepository.get(userId);

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      name: String(user.name ?? ''),
      email: String(user.email ?? ''),
      createdAt: String(user.createdAt ?? ''),
      profile: user.profile,
      lastBackupAt: user.lastBackupAt ?? null,
    },
    meals: mealRepository.listByUser(userId),
    weightEntries: weightRepository.listByUser(userId),
    waterEntries: waterRepository.listByUser(userId),
    notifications: notifications ?? { userId, enabled: false },
    streak: streak
      ? {
          currentStreak: Number(streak.currentStreak ?? 0),
          longestStreak: Number(streak.longestStreak ?? 0),
          lastLogDate: String(streak.lastLogDate ?? ''),
        }
      : { currentStreak: 0, longestStreak: 0, lastLogDate: '' },
    nutritionCache: nutritionRepository.listByUser(userId),
    imageIndex,
  };

  return { manifest, images };
}

export const backupService = {
  async buildZip(userId: string): Promise<{ buffer: Buffer; filename: string; exportedAt: string }> {
    const { manifest, images } = gatherUserData(userId);

    const zip = new JSZip();
    zip.file('backup.json', JSON.stringify(manifest, null, 2));

    const imagesFolder = zip.folder('images')!;
    const imageByMealId = new Map(images.map((img) => [img.mealId, img.image]));
    for (const entry of manifest.imageIndex) {
      const bytes = imageByMealId.get(entry.mealId);
      if (bytes) imagesFolder.file(entry.filename, bytes);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const dateStamp = manifest.exportedAt.slice(0, 10);
    return { buffer, filename: `fitpal-backup-${dateStamp}.zip`, exportedAt: manifest.exportedAt };
  },
};
