import type Database from 'better-sqlite3';
import { logger } from '../logger.js';

// ---------------------------------------------------------------------------
// Versioned schema migrations.
//
// Replaces the previous run-on-startup `CREATE TABLE IF NOT EXISTS` block with
// an ordered, versioned migration list tracked by SQLite's `user_version`
// pragma. On boot we apply every migration whose version is greater than the
// database's current `user_version`, each inside a transaction, then bump the
// version. This makes schema evolution explicit and auditable while staying
// dependency-free.
//
// Rules:
//   - Migrations are append-only. Never edit or reorder an existing migration
//     once it has shipped; add a new one with the next version number.
//   - `version` values must be sequential starting at 1.
//   - Migration 1 reproduces the original schema with IF NOT EXISTS, so it is a
//     safe no-op on databases created before migrations existed (their
//     user_version is 0, so it runs once and simply confirms the schema).
// ---------------------------------------------------------------------------

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id    TEXT PRIMARY KEY,
          email TEXT,
          data  TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS meals (
          id      TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          data    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_meals_user ON meals(user_id);

        CREATE TABLE IF NOT EXISTS weights (
          id      TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          data    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_weights_user ON weights(user_id);

        CREATE TABLE IF NOT EXISTS notifications (
          user_id TEXT PRIMARY KEY,
          data    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS streaks (
          user_id TEXT PRIMARY KEY,
          data    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS nutrition_cache (
          key     TEXT PRIMARY KEY,
          data    TEXT NOT NULL,
          source  TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    name: 'meal images',
    up: (db) => {
      // Binary store for photo-based meal logging. Kept in its own table (not in
      // the meal's JSON `data`) so the whole-history meal fetch never carries
      // image bytes; the image is loaded lazily by its own endpoint. The FK with
      // ON DELETE CASCADE removes the image automatically when its meal is
      // deleted (single delete or account-wide wipe), since foreign_keys is ON.
      db.exec(`
        CREATE TABLE IF NOT EXISTS meal_images (
          meal_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          mime    TEXT NOT NULL,
          image   BLOB NOT NULL,
          FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_meal_images_user ON meal_images(user_id);
      `);
    },
  },
  {
    version: 3,
    name: 'trend date indexes',
    up: (db) => {
      // Expression indexes over the JSON `date` field so date-range trend
      // queries (recent N days of meals/weights) can seek by (user_id, date)
      // instead of scanning every row. ISO 8601 date strings sort
      // chronologically, so a plain string index gives correct range order.
      // No schema column is added; inserts/updates are unchanged.
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_meals_user_date
          ON meals(user_id, json_extract(data, '$.date'));
        CREATE INDEX IF NOT EXISTS idx_weights_user_date
          ON weights(user_id, json_extract(data, '$.date'));
      `);
    },
  },
  {
    version: 4,
    name: 'clear gram/ml nutrition cache poison',
    up: (db) => {
      // Previous AI fills stored per-100g values under gram/ml keys but
      // multiplied them as per-1g, causing 100x calorie inflation. The prompt
      // fix aligns the model to per-100g output and the service now divides
      // back to per-1g before caching, so these stale entries must be removed.
      db.exec(`
        DELETE FROM nutrition_cache WHERE key LIKE '%|gram' OR key LIKE '%|ml';
      `);
    },
  },
  {
    version: 5,
    name: 'reseed nutrition cache with micronutrients',
    up: (db) => {
      // Seed entries previously omitted micronutrients (vitaminA/C/D, calcium,
      // iron, magnesium, potassium). Deleting the old seed rows lets
      // seedNutritionCache(), which runs immediately after migrations on
      // startup, re-insert them with the complete nutrient profile.
      // Learned (user-corrected) entries keyed by source='learned' are untouched.
      db.exec(`
        DELETE FROM nutrition_cache WHERE source = 'seed';
      `);
    },
  },
  {
    version: 6,
    name: 'user-scoped nutrition cache',
    up: (db) => {
      // Learned entries are now keyed as "user:{userId}:{normName}|{unit}" so
      // one user's AI-learned values never bleed into another user's session.
      // Seed rows keep the unscoped key and user_id stays NULL for them.
      // Existing learned rows (unscoped keys) are removed so they are
      // re-filled per-user on next use; seeds are untouched.
      db.exec(`
        ALTER TABLE nutrition_cache ADD COLUMN user_id TEXT;
        DELETE FROM nutrition_cache WHERE source = 'learned';
      `);
    },
  },
  {
    version: 7,
    name: 'water intake table',
    up: (db) => {
      // Each row represents one logged cup of water. Kept as a JSON collection
      // (same pattern as meals/weights) so the base repository methods work
      // unchanged. The expression index on $.date mirrors the v3 meal/weight
      // indexes so per-day queries are driven by (user_id, date) instead of a
      // full scan.
      db.exec(`
        CREATE TABLE IF NOT EXISTS water_intake (
          id      TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          data    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_water_user ON water_intake(user_id);
        CREATE INDEX IF NOT EXISTS idx_water_user_date
          ON water_intake(user_id, json_extract(data, '$.date'));
      `);
    },
  },
  {
    version: 8,
    name: 'push subscriptions table',
    up: (db) => {
      // One row per browser/device subscription. A user may have multiple active
      // subscriptions (phone + desktop). Uses the standard JSON collection shape
      // so JsonCollectionRepository methods work unchanged. endpoint is unique
      // so re-subscribing the same device upserts rather than duplicates.
      db.exec(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id      TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          data    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_endpoint
          ON push_subscriptions(json_extract(data, '$.endpoint'));
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  // Guard against accidental gaps/duplicates in the migration list.
  MIGRATIONS.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration list is not sequential: expected version ${index + 1}, got ${migration.version} (${migration.name}).`
      );
    }
  });

  const current = db.pragma('user_version', { simple: true }) as number;
  const pending = MIGRATIONS.filter((m) => m.version > current);

  if (pending.length === 0) {
    logger.info('Database schema up to date', { version: current });
    return;
  }

  for (const migration of pending) {
    const apply = db.transaction(() => {
      migration.up(db);
      // user_version takes a literal, not a bind parameter.
      db.pragma(`user_version = ${migration.version}`);
    });
    apply();
    logger.info('Applied migration', { version: migration.version, name: migration.name });
  }
}
