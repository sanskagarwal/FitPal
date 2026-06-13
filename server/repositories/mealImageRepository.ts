import { getDb } from '../db/database.js';

// ---------------------------------------------------------------------------
// Repository for meal photos (binary BLOBs), kept separate from the JSON-blob
// meal record so the whole-history meal fetch never carries image bytes. One
// image per meal (meal_id is the primary key). All reads/writes are scoped by
// userId so a caller can never touch another user's image. The meal_images row
// is removed automatically by the FK ON DELETE CASCADE when its meal is deleted.
// ---------------------------------------------------------------------------

export interface MealImage {
  mime: string;
  image: Buffer;
}

export const mealImageRepository = {
  // Insert or replace the image for a meal owned by `userId`.
  upsert(mealId: string, userId: string, mime: string, image: Buffer): void {
    getDb()
      .prepare(
        `INSERT INTO meal_images (meal_id, user_id, mime, image) VALUES (?, ?, ?, ?)
         ON CONFLICT(meal_id) DO UPDATE SET mime = excluded.mime, image = excluded.image`
      )
      .run(mealId, userId, mime, image);
  },

  // Fetch the image for a meal, only when it belongs to `userId`.
  get(mealId: string, userId: string): MealImage | null {
    const row = getDb()
      .prepare(`SELECT mime, image FROM meal_images WHERE meal_id = ? AND user_id = ?`)
      .get(mealId, userId) as { mime: string; image: Buffer } | undefined;
    return row ? { mime: row.mime, image: row.image } : null;
  },

  // Delete the image for a meal owned by `userId`. Returns true when removed.
  delete(mealId: string, userId: string): boolean {
    return (
      getDb()
        .prepare(`DELETE FROM meal_images WHERE meal_id = ? AND user_id = ?`)
        .run(mealId, userId).changes > 0
    );
  },
};
