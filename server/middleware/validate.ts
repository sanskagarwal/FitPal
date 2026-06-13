import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../errors.js';

// `validateBody(schema)` parses `req.body` before the controller runs. On
// success the parsed value replaces `req.body`; on failure it throws a
// ValidationError that the central handler renders as a 400 with the field.
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
