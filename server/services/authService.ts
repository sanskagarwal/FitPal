import { randomUUID } from 'node:crypto';
import {
  hashPassword,
  verifyPassword,
  isLegacyHash,
} from '../auth.js';
import { userRepository, toPublicUser, type StoredUser } from '../repositories/userRepository.js';
import { AuthError, ConflictError, ForbiddenError, NotFoundError } from '../errors.js';

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
    userRepository.save(user);
    return { user: toPublicUser(user)!, userId: user.id };
  },

  async login(email: string, password: string): Promise<{ user: PublicUser; userId: string }> {
    const record = userRepository.findByEmail(email);
    if (!record) {
      throw new AuthError('Invalid email or password');
    }
    // Legacy unsalted SHA-256 accounts must set a new password once (the old
    // hash can never verify under bcrypt).
    if (isLegacyHash(record.password)) {
      throw new ConflictError('Please reset your password to continue', 'legacy_password');
    }
    const valid = await verifyPassword(password, record.password ?? '');
    if (!valid) {
      throw new AuthError('Invalid email or password');
    }
    return { user: toPublicUser(record)!, userId: record.id };
  },

  // One-time migration path for legacy SHA-256 accounts. Restricted to accounts
  // still on the legacy hash so it can't take over already-migrated accounts.
  async resetPassword(
    email: string,
    password: string
  ): Promise<{ user: PublicUser; userId: string }> {
    const record = userRepository.findByEmail(email);
    if (!record) {
      throw new NotFoundError('User');
    }
    if (!isLegacyHash(record.password)) {
      throw new ForbiddenError('Password reset is not available for this account');
    }
    const updated: StoredUser = { ...record, password: await hashPassword(password) };
    userRepository.save(updated);
    return { user: toPublicUser(updated)!, userId: updated.id };
  },

  getMe(userId: string): PublicUser {
    const record = userRepository.findById(userId);
    if (!record) {
      throw new NotFoundError('User');
    }
    return toPublicUser(record)!;
  },
};
