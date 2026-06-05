import { Request, Response, NextFunction } from 'express';

// Wrap an async route handler so any thrown/rejected error is forwarded to the
// central error-handling middleware instead of crashing the request. Lets
// controllers `throw new NotFoundError()` etc. without their own try/catch.
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
