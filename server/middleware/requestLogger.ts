import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger, runWithContext } from '../logger.js';

// ---------------------------------------------------------------------------
// Request logging + correlation id.
//
// Generates (or honours an inbound `x-request-id`) a correlation id for every
// request, binds it into the async-local logging context, echoes it back on the
// response header, and logs a structured line when the response finishes
// (method, path, status, duration, user). Mounted first so the id is available
// to every downstream handler and to the central error handler.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const INBOUND_ID_MAX = 200;

function inboundRequestId(req: Request): string | undefined {
  const header = req.headers['x-request-id'];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > INBOUND_ID_MAX) return undefined;
  return trimmed;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = inboundRequestId(req) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    });
  });

  // Bind the context for the lifetime of this request so logger calls anywhere
  // downstream are automatically tagged with the request id (userId is added
  // later by requireAuth).
  runWithContext({ requestId }, () => next());
}
