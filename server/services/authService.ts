import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword } from '../auth.js';
import { userRepository, toPublicUser, type StoredUser } from '../repositories/userRepository.js';
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
    userRepository.save(user);
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
};
