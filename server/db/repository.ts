import { getDb } from './database.js';

// ---------------------------------------------------------------------------
// Base repositories for the JSON-blob storage pattern.
//
// Every entity is persisted as a JSON document in a `data` column. These two
// generic classes capture the two shapes used across the app so the concrete
// repositories don't re-implement the same INSERT/SELECT/UPDATE/DELETE SQL:
//
//   JsonCollectionRepository  many rows per user, keyed by id   (meals, weights)
//   JsonSingletonRepository   exactly one row per user          (notifications, streaks)
//
// All ownership-scoped operations take `userId` and filter on it, so a caller
// can never read or mutate another user's rows.
// ---------------------------------------------------------------------------

export class JsonCollectionRepository<T extends { id: string; userId: string }> {
  constructor(private readonly table: string) {}

  insert(entity: T): void {
    getDb()
      .prepare(`INSERT INTO ${this.table} (id, user_id, data) VALUES (?, ?, ?)`)
      .run(entity.id, entity.userId, JSON.stringify(entity));
  }

  listByUser(userId: string): T[] {
    const rows = getDb()
      .prepare(`SELECT data FROM ${this.table} WHERE user_id = ?`)
      .all(userId) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  // List rows owned by `userId` whose JSON `date` falls within [start, end]
  // (inclusive). `start` and `end` are ISO 8601 strings, which sort
  // chronologically, so the (user_id, date) expression index drives the range.
  listByUserInRange(userId: string, start: string, end: string): T[] {
    const rows = getDb()
      .prepare(
        `SELECT data FROM ${this.table} WHERE user_id = ? AND json_extract(data, '$.date') BETWEEN ? AND ?`
      )
      .all(userId, start, end) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  // Update only when the row belongs to `userId`. Returns false if no such row.
  update(id: string, userId: string, entity: T): boolean {
    const result = getDb()
      .prepare(`UPDATE ${this.table} SET data = ? WHERE id = ? AND user_id = ?`)
      .run(JSON.stringify(entity), id, userId);
    return result.changes > 0;
  }

  // Delete only when the row belongs to `userId`. Returns false if no such row.
  delete(id: string, userId: string): boolean {
    const result = getDb()
      .prepare(`DELETE FROM ${this.table} WHERE id = ? AND user_id = ?`)
      .run(id, userId);
    return result.changes > 0;
  }

  // Delete every row owned by `userId`. Returns the number of rows removed.
  // Used when wiping all of a user's data (e.g. account deletion).
  deleteByUser(userId: string): number {
    return getDb().prepare(`DELETE FROM ${this.table} WHERE user_id = ?`).run(userId).changes;
  }
}

export class JsonSingletonRepository<T extends { userId: string }> {
  constructor(private readonly table: string) {}

  upsert(entity: T): void {
    getDb()
      .prepare(
        `INSERT INTO ${this.table} (user_id, data) VALUES (@userId, @data)
         ON CONFLICT(user_id) DO UPDATE SET data = excluded.data`
      )
      .run({ userId: entity.userId, data: JSON.stringify(entity) });
  }

  get(userId: string): T | null {
    const row = getDb()
      .prepare(`SELECT data FROM ${this.table} WHERE user_id = ?`)
      .get(userId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : null;
  }

  // Delete the single row owned by `userId`, if any. Returns true when removed.
  deleteByUser(userId: string): boolean {
    return getDb().prepare(`DELETE FROM ${this.table} WHERE user_id = ?`).run(userId).changes > 0;
  }
}
