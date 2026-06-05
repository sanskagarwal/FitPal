import { getDb } from '../db/database.js';
import { NUTRITION_SEED } from '../nutritionSeed.js';

// ---------------------------------------------------------------------------
// Nutrition cache.
//
// Grounds the chat agent's per-unit macros so the same food logs consistently
// instead of being re-estimated each time. Seeded with curated staples, then
// grows at runtime from high-confidence model outputs. Keyed by normalized
// "name|unit".
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

// Seed curated staples. Uses INSERT OR IGNORE so existing learned/seed rows are
// never overwritten on restart.
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
  get(name: string, unit: string): CachedNutrition | null {
    const row = getDb()
      .prepare('SELECT data FROM nutrition_cache WHERE key = ?')
      .get(nutritionKey(name, unit)) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as CachedNutrition) : null;
  },

  // Store a learned entry only if absent, so curated seeds are never overwritten
  // by model output and the first confident estimate becomes the stable value.
  put(name: string, unit: string, value: CachedNutrition): void {
    getDb()
      .prepare('INSERT OR IGNORE INTO nutrition_cache (key, data, source) VALUES (?, ?, ?)')
      .run(nutritionKey(name, unit), JSON.stringify(value), 'learned');
  },
};
