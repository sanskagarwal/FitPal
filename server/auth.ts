import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './env.js';

// ---------------------------------------------------------------------------
// Authentication primitives (crypto, tokens, cookies).
//
// Passwords are hashed with bcrypt server-side (the client never hashes). A
// signed JWT is issued in an httpOnly cookie so it is inaccessible to JS and
// can't be exfiltrated by XSS. Request-time guards (requireAuth, ownership)
// live in middleware/auth.ts and build on `verifyAuthToken` here.
// ---------------------------------------------------------------------------

export const AUTH_COOKIE_NAME = 'fitpal-token';
const TOKEN_TTL = '30d';
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // bcrypt hashes start with $2; anything else can never verify.
  if (!hash || !hash.startsWith('$2')) return false;
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyAuthToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/',
};

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE_NAME, signToken(userId), {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, cookieBase);
}
