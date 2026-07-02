import JSZip from 'jszip';
import { getDb } from '../db/database.js';
import { NotFoundError, ValidationError } from '../errors.js';
import { userRepository, type StoredUser } from '../repositories/userRepository.js';
import { mealRepository, type MealRecord } from '../repositories/mealRepository.js';
import { weightRepository, type WeightRecord } from '../repositories/weightRepository.js';
import { waterRepository, type WaterRecord } from '../repositories/waterRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { streakRepository } from '../repositories/streakRepository.js';
import { nutritionRepository, type CachedNutrition } from '../repositories/nutritionRepository.js';
import { mealImageRepository, type UserMealImage } from '../repositories/mealImageRepository.js';
import { MAX_INPUT_BYTES as MAX_IMAGE_BYTES } from './imageService.js';
import { BackupManifestSchema } from '../validation.js';

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

// Upper bound for the uploaded ZIP itself (compressed), enforced by multer in
// backupRoutes.ts before the file ever reaches this service.
export const MAX_RESTORE_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

export type RestoreMode = 'merge' | 'replace';

export interface RestoreResult {
  meals: number;
  weightEntries: number;
  waterEntries: number;
  images: number;
  nutritionCacheEntries: number;
  mode: RestoreMode;
}

// Upper bound on the decompressed backup.json text, checked before JSON.parse.
const MAX_MANIFEST_CHARS = 20 * 1024 * 1024; // 20 MB
// Upper bound on the sum of every decompressed image, checked while
// extracting. Together with the per-image cap (MAX_IMAGE_BYTES, shared with
// the live upload path) this bounds how much a single restore can inflate a
// crafted ZIP to in memory, defusing a decompression-bomb style upload.
const MAX_TOTAL_IMAGE_BYTES = 80 * 1024 * 1024; // 80 MB

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

  // Restore a user's data from a previously exported ZIP.
  //
  // Every record is re-scoped onto `userId` (the authenticated caller), so a
  // backup taken from one account can be restored onto another. Everything
  // that touches the DB happens inside a single synchronous transaction so a
  // failure partway through leaves the account untouched - the async ZIP/JSON
  // work (parsing, validating, extracting image bytes) all happens first and
  // is fully materialized before the transaction opens, since better-sqlite3
  // transactions are synchronous and cannot await.
  async restore(userId: string, zipBuffer: Buffer, mode: RestoreMode): Promise<RestoreResult> {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(zipBuffer);
    } catch {
      throw new ValidationError('file - not a valid ZIP archive');
    }

    const manifestFile = zip.file('backup.json');
    if (!manifestFile) throw new ValidationError('file - missing backup.json');

    const manifestText = await manifestFile.async('string');
    if (manifestText.length > MAX_MANIFEST_CHARS) {
      throw new ValidationError('file - backup.json is too large');
    }

    let rawManifest: unknown;
    try {
      rawManifest = JSON.parse(manifestText);
    } catch {
      throw new ValidationError('file - backup.json is not valid JSON');
    }

    const parsed = BackupManifestSchema.safeParse(rawManifest);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path.join('.') || 'backup.json';
      throw new ValidationError(`file - ${path}: ${issue?.message ?? 'invalid'}`);
    }
    const manifest = parsed.data;

    // Every image must belong to a meal that is also present in this backup -
    // catches a hand-edited manifest before it can trip the meals -> images FK.
    const mealIds = new Set(manifest.meals.map((m) => m.id));
    for (const entry of manifest.imageIndex) {
      if (!mealIds.has(entry.mealId)) {
        throw new ValidationError('file - imageIndex references a meal not present in the backup');
      }
    }

    // Extract every referenced image up front (async). Entries not listed in
    // imageIndex are never read, so extra files stuffed into the ZIP are inert.
    const images = new Map<string, { mime: string; buffer: Buffer }>();
    let totalImageBytes = 0;
    for (const entry of manifest.imageIndex) {
      const file = zip.file(`images/${entry.filename}`);
      if (!file) continue;
      const buffer = await file.async('nodebuffer');
      if (buffer.length > MAX_IMAGE_BYTES) {
        throw new ValidationError('file - an image exceeds the size limit');
      }
      totalImageBytes += buffer.length;
      if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
        throw new ValidationError('file - total image payload is too large');
      }
      images.set(entry.mealId, { mime: entry.mime, buffer });
    }

    const meals = manifest.meals.map((m) => ({ ...m, userId })) as MealRecord[];
    const weightEntries = manifest.weightEntries.map((w) => ({ ...w, userId })) as WeightRecord[];
    const waterEntries = manifest.waterEntries.map((w) => ({ ...w, userId })) as WaterRecord[];

    const existingUser = userRepository.findById(userId);
    if (!existingUser) throw new NotFoundError('User');

    const applyRestore = getDb().transaction(() => {
      if (mode === 'replace') {
        mealRepository.deleteByUser(userId); // cascades meal_images via ON DELETE CASCADE
        weightRepository.deleteByUser(userId);
        waterRepository.deleteByUser(userId);
        nutritionRepository.deleteByUser(userId);
      }

      // Meals before images: meal_images has an FK on meals(id).
      for (const meal of meals) mealRepository.upsert(meal);
      for (const weight of weightEntries) weightRepository.upsert(weight);
      for (const water of waterEntries) waterRepository.upsert(water);

      notificationRepository.upsert({ ...manifest.notifications, userId });
      streakRepository.upsert({ ...manifest.streak, userId });

      let restoredNutritionEntries = 0;
      for (const entry of manifest.nutritionCache) {
        if (!entry.data) continue;
        const separatorIndex = entry.key.lastIndexOf('|');
        if (separatorIndex <= 0) continue;
        const name = entry.key.slice(0, separatorIndex);
        const unit = entry.key.slice(separatorIndex + 1);
        nutritionRepository.put(name, unit, entry.data, userId);
        restoredNutritionEntries++;
      }

      let restoredImages = 0;
      for (const [mealId, img] of images) {
        mealImageRepository.upsert(mealId, userId, img.mime, img.buffer);
        restoredImages++;
      }

      const restoredUser: StoredUser = {
        ...existingUser,
        name: manifest.user.name,
        profile: manifest.user.profile,
        id: userId,
        email: existingUser.email,
        password: existingUser.password,
      };
      userRepository.save(restoredUser);

      return { restoredImages, restoredNutritionEntries };
    });

    const { restoredImages, restoredNutritionEntries } = applyRestore();

    return {
      meals: meals.length,
      weightEntries: weightEntries.length,
      waterEntries: waterEntries.length,
      images: restoredImages,
      nutritionCacheEntries: restoredNutritionEntries,
      mode,
    };
  },
};
