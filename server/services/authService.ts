import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '../auth.js';
import { userRepository, toPublicUser, type StoredUser } from '../repositories/userRepository.js';
import { mealRepository } from '../repositories/mealRepository.js';
import { weightRepository } from '../repositories/weightRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { streakRepository } from '../repositories/streakRepository.js';
import { getDb } from '../db/database.js';
import { AuthError, ConflictError, NotFoundError } from '../errors.js';

export type PublicUser = NonNullable<ReturnType<typeof toPublicUser>>;

export const authService = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    profile: unknown;
  }): Promise<{ user: PublicUser; userId: string }> {
    if (userRepository.emailExists(input.email)) {
      throw new ConflictError('Email already exists');
    }
    const user: StoredUser = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      password: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
      profile: input.profile,
    };
    try {
      userRepository.save(user);
    } catch (err) {
      // Backstop for the race between emailExists() and save(): the UNIQUE
      // index on users(email) rejects a concurrent duplicate registration.
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new ConflictError('Email already exists');
      }
      throw err;
    }
    return { user: toPublicUser(user)!, userId: user.id };
  },

  async login(email: string, password: string): Promise<{ user: PublicUser; userId: string }> {
    const record = userRepository.findByEmail(email);
    if (!record) {
      throw new AuthError('Invalid email or password');
    }
    const valid = await verifyPassword(password, record.password ?? '');
    if (!valid) {
      throw new AuthError('Invalid email or password');
    }
    return { user: toPublicUser(record)!, userId: record.id };
  },

  getMe(userId: string): PublicUser {
    const record = userRepository.findById(userId);
    if (!record) {
      throw new NotFoundError('User');
    }
    return toPublicUser(record)!;
  },

  // Permanently delete the user's account and all associated data. Requires the
  // current password as a confirmation step (defence against an unattended
  // session or CSRF triggering an irreversible wipe). All deletes run in a
  // single SQLite transaction so the account is either fully removed or left
  // untouched — never half-deleted.
  async deleteAccount(userId: string, password: string): Promise<void> {
    const record = userRepository.findById(userId);
    if (!record) {
      throw new NotFoundError('User');
    }
    const valid = await verifyPassword(password, record.password ?? '');
    if (!valid) {
      throw new AuthError('Incorrect password');
    }

    // bcrypt verification above is async; the transaction body must stay
    // synchronous (better-sqlite3 requirement), so it only runs the deletes.
    getDb().transaction(() => {
      mealRepository.deleteByUser(userId);
      weightRepository.deleteByUser(userId);
      notificationRepository.deleteByUser(userId);
      streakRepository.deleteByUser(userId);
      userRepository.delete(userId);
    })();
  },
};
