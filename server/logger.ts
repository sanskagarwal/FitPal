import { AsyncLocalStorage } from 'async_hooks';

// ---------------------------------------------------------------------------
// Structured logging.
//
// Emits one JSON object per line (newline-delimited JSON) so logs are
// machine-parseable in production while staying greppable in development. A
// per-request context (request id + user id) is carried implicitly via
// AsyncLocalStorage, so any log call inside a request - including from deep in
// the service layer or the central error handler - is automatically tagged
// without threading the id through every function. No external dependency.
//
// Configurable via env:
//   LOG_LEVEL   one of debug|info|warn|error (default: info)
//   LOG_PRETTY  set to "1"/"true" for human-readable single-line output
//               (default: pretty in development, JSON otherwise)
// ---------------------------------------------------------------------------

export interface RequestContext {
  requestId: string;
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

// Run `fn` with the given request context bound for the duration of the call
// (and any async work it awaits).
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

// The context for the in-flight request, if any.
export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}

// Attach/replace a field on the active context (e.g. userId once auth resolves).
export function setContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (ctx) Object.assign(ctx, patch);
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): number {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[raw as LogLevel] ?? LEVELS.info;
}

function prettyEnabled(): boolean {
  const raw = process.env.LOG_PRETTY;
  if (raw != null) return raw === '1' || raw.toLowerCase() === 'true';
  return (process.env.NODE_ENV || 'development') !== 'production';
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < configuredLevel()) return;

  const ctx = storage.getStore();
  const record: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    message,
    ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx?.userId ? { userId: ctx.userId } : {}),
    ...meta,
  };

  const line = prettyEnabled() ? formatPretty(record) : JSON.stringify(record);
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(line);
}

function formatPretty(record: Record<string, unknown>): string {
  const { time, level, message, requestId, ...rest } = record;
  const tag = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
  const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  return `${time} ${String(level).toUpperCase().padEnd(5)}${tag} ${message}${extras}`;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
