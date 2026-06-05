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
