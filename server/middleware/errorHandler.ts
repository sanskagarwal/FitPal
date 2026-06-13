import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

// Central error handler: turns thrown errors into HTTP responses. `AppError`s
// carry their own status/code; zod errors become 400s; anything else is an
// opaque 500 (details logged, not leaked). Registered last, after all routes.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
    return;
  }

  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const path = issue?.path.join('.') || 'request';
    res.status(400).json({ error: `Invalid request: ${path} - ${issue?.message ?? 'invalid'}` });
    return;
  }

  // http-errors-style errors (e.g. body-parser's malformed-JSON 400) carry their
  // own client-facing status. Honour 4xx so a bad request isn't masked as a 500.
  const status = (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const message = err instanceof Error ? err.message : 'Bad request';
    res.status(status).json({ error: message });
    return;
  }

  logger.error('Unhandled error', {
    name: err instanceof Error ? err.name : typeof err,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({ error: 'Internal server error' });
}
