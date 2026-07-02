import { getDb } from '../db/database.js';

// ---------------------------------------------------------------------------
// User repository.
//
// Users don't fit the generic collection/singleton shapes (they're keyed by id
// AND indexed by email, and carry the password hash), so this repository is
// hand-written. The full record - including the bcrypt hash - is server-only;
// callers must run it through `toPublicUser` before sending it to a client.
// ---------------------------------------------------------------------------

export interface StoredUser {
  id: string;
  email?: string;
  password?: string;
  lastBackupAt?: string | null;
  [key: string]: unknown;
}

type UserRow = { data: string; last_backup_at: string | null };

function rowToUser(row: UserRow): StoredUser {
  const user = JSON.parse(row.data) as StoredUser;
  user.lastBackupAt = row.last_backup_at;
  return user;
}

export const userRepository = {
  save(user: StoredUser): void {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, data) VALUES (@id, @email, @data)
         ON CONFLICT(id) DO UPDATE SET email = excluded.email, data = excluded.data`
      )
      .run({ id: user.id, email: user.email ?? null, data: JSON.stringify(user) });
  },

  findById(id: string): StoredUser | null {
    const row = getDb().prepare('SELECT data, last_backup_at FROM users WHERE id = ?').get(id) as
      | UserRow
      | undefined;
    return row ? rowToUser(row) : null;
  },

  findByEmail(email: string): StoredUser | null {
    const row = getDb()
      .prepare('SELECT data, last_backup_at FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
    return row ? rowToUser(row) : null;
  },

  emailExists(email: string): boolean {
    return Boolean(getDb().prepare('SELECT 1 FROM users WHERE email = ?').get(email));
  },

  setLastBackupAt(userId: string, isoString: string): void {
    getDb().prepare('UPDATE users SET last_backup_at = ? WHERE id = ?').run(isoString, userId);
  },

  // Delete the user row by id. Returns true when a row was removed. Callers are
  // responsible for also removing the user's other data (meals, weights, etc.).
  delete(id: string): boolean {
    return getDb().prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
  },
};

// Strip sensitive fields before returning a user to the client.
export function toPublicUser(user: StoredUser | null): Omit<StoredUser, 'password'> | null {
  if (!user) return null;
  const { password: _password, ...publicUser } = user;
  void _password;
  return publicUser;
}
