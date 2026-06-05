import { userRepository, toPublicUser, type StoredUser } from '../repositories/userRepository.js';
import { NotFoundError } from '../errors.js';
import type { PublicUser } from './authService.js';

export const userService = {
  getOwn(userId: string): PublicUser {
    const record = userRepository.findById(userId);
    if (!record) {
      throw new NotFoundError('User');
    }
    return toPublicUser(record)!;
  },

  // Merge a profile/goal update into the stored record. id, email and the
  // server-managed password hash are preserved so the client can never change
  // them through this path.
  upsertOwn(userId: string, update: Record<string, unknown>): PublicUser {
    const existing = userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError('User');
    }
    const merged: StoredUser = {
      ...existing,
      ...update,
      id: userId,
      email: existing.email,
      password: existing.password,
    };
    userRepository.save(merged);
    return toPublicUser(merged)!;
  },
};
