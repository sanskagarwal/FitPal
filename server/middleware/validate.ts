import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors.js';

// ---------------------------------------------------------------------------
// Zod validation middleware.
//
// `validateBody(schema)` parses `req.body` against the schema before the
// controller runs, so every write route shares one consistent validation +
// error path. On success the parsed value replaces `req.body` (so controllers
// get the typed, coerced data); on failure it throws a ValidationError that the
// central error handler renders as a 400 with the first offending field.
// ---------------------------------------------------------------------------
export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue?.path.join('.') || 'body';
      throw new ValidationError(`${path} - ${issue?.message ?? 'invalid'}`);
    }
    req.body = result.data;
    next();
  };
}
