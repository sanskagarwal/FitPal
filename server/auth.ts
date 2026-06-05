import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Authentication & authorization primitives.
//
// Passwords are hashed with bcrypt server-side (the client never hashes). A
// signed JWT is issued in an httpOnly cookie so it is inaccessible to JS and
// can't be exfiltrated by XSS. `requireAuth` populates `req.userId`, and the
// ownership guards ensure a user can only read/write their own records.
// ---------------------------------------------------------------------------

const COOKIE_NAME = 'fitpal-token';
const TOKEN_TTL = '30d';
const BCRYPT_ROUNDS = 12;

// JWT_SECRET is validated at startup in env.ts; assert here for type-narrowing.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // bcrypt hashes start with $2; anything else (e.g. legacy unsalted SHA-256)
  // can never verify and must go through the one-time reset flow.
  if (!hash || !hash.startsWith('$2')) return false;
  return bcrypt.compare(password, hash);
}

// True for the legacy client-side SHA-256 hashes (64 hex chars, no bcrypt prefix).
export function isLegacyHash(hash: string | undefined): boolean {
  return Boolean(hash) && !hash!.startsWith('$2');
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: TOKEN_TTL });
}

function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret()) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const cookieBase = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(COOKIE_NAME, signToken(userId), {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, cookieBase);
}

// Augment Express's Request so `req.userId` is typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME];
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  req.userId = userId;
  next();
}

// Reject when a route param identifying a user doesn't match the session user.
export function requireOwnParam(paramName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (String(req.params[paramName]) !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

// Reject when a write body targets a different user than the session user.
export function requireOwnBody(field: 'userId' | 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    if (typeof value !== 'string' || value !== req.userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
