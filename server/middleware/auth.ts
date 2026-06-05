import { Request, Response, NextFunction } from 'express';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../auth.js';
import { AuthError, ForbiddenError } from '../errors.js';

// ---------------------------------------------------------------------------
// Request-time auth guards.
//
// `requireAuth` reads the JWT from the httpOnly cookie and populates
// `req.userId`. The ownership guards then ensure a user can only read/write
// their own records, closing IDOR holes. All guards throw typed errors so the
// central error handler renders consistent 401/403 responses.
// ---------------------------------------------------------------------------

// Augment Express's Request so `req.userId` is typed everywhere.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAME];
  const userId = token ? verifyAuthToken(token) : null;
  if (!userId) {
    throw new AuthError();
  }
  req.userId = userId;
  next();
}

// Reject when a route param identifying a user doesn't match the session user.
export function requireOwnParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (String(req.params[paramName]) !== req.userId) {
      throw new ForbiddenError();
    }
    next();
  };
}

// Reject when a write body targets a different user than the session user.
export function requireOwnBody(field: 'userId' | 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = (req.body as Record<string, unknown> | undefined)?.[field];
    if (typeof value !== 'string' || value !== req.userId) {
      throw new ForbiddenError();
    }
    next();
  };
}
