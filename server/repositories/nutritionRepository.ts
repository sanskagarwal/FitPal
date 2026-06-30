import { getDb } from '../db/database.js';
import { NUTRITION_SEED } from '../nutritionSeed.js';

// ---------------------------------------------------------------------------
// Nutrition cache.
//
// Grounds the chat agent's per-unit macros so the same food logs consistently
// instead of being re-estimated each time. Seeded with curated staples, then
// grows at runtime from high-confidence model outputs.
//
// Key scheme (two tiers):
//   Seed rows  : "{normName}|{unit}"               user_id = NULL
//   Learned rows: "user:{userId}:{normName}|{unit}" user_id = userId
//
// get() tries the user-scoped key first, then falls back to the seed key.
// put() always writes to the user-scoped key and only updates existing learned
// rows (seed rows are protected by the WHERE clause in the upsert).
// ---------------------------------------------------------------------------

export interface CachedNutrition {
  servingSize?: string;
  nutrients: Record<string, number>;
}

export function nutritionKey(name: string, unit: string): string {
  const normName = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${normName}|${unit.toLowerCase().trim()}`;
}

function userNutritionKey(userId: string, name: string, unit: string): string {
  return `user:${userId}:${nutritionKey(name, unit)}`;
}

// Seed curated staples. Uses INSERT OR IGNORE so existing seed rows are never
// overwritten on restart (migration wipes old seeds when the data changes).
export function seedNutritionCache(): void {
  const db = getDb();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO nutrition_cache (key, data, source) VALUES (?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const entry of NUTRITION_SEED) {
      insert.run(
        nutritionKey(entry.name, entry.unit),
        JSON.stringify({ servingSize: entry.servingSize, nutrients: entry.nutrients }),
        'seed'
      );
    }
  });
  tx();
}

export const nutritionRepository = {
  // Try user-scoped learned entry first; fall back to global seed.
  get(name: string, unit: string, userId?: string): CachedNutrition | null {
    const db = getDb();
    if (userId) {
      const row = db
        .prepare('SELECT data FROM nutrition_cache WHERE key = ?')
        .get(userNutritionKey(userId, name, unit)) as { data: string } | undefined;
      if (row) return JSON.parse(row.data) as CachedNutrition;
    }
    const seedRow = db
      .prepare('SELECT data FROM nutrition_cache WHERE key = ?')
      .get(nutritionKey(name, unit)) as { data: string } | undefined;
    return seedRow ? (JSON.parse(seedRow.data) as CachedNutrition) : null;
  },

  // Upsert a user-scoped learned entry. The WHERE clause protects seed rows
  // from being overwritten even if somehow the same base key were matched.
  put(name: string, unit: string, value: CachedNutrition, userId: string): void {
    getDb()
      .prepare(
        `INSERT INTO nutrition_cache (key, data, source, user_id) VALUES (?, ?, 'learned', ?)
         ON CONFLICT(key) DO UPDATE SET data = excluded.data, user_id = excluded.user_id
         WHERE source = 'learned'`
      )
      .run(userNutritionKey(userId, name, unit), JSON.stringify(value), userId);
  },

  deleteByUser(userId: string): void {
    getDb()
      .prepare('DELETE FROM nutrition_cache WHERE user_id = ?')
      .run(userId);
  },
};
