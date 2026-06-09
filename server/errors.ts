// ---------------------------------------------------------------------------
// Typed application errors.
//
// Each error carries the HTTP status it should map to, so controllers and
// services can `throw` semantically (e.g. `throw new NotFoundError('Meal')`)
// and the central error-handling middleware turns it into the right response.
// This replaces the ~25 ad-hoc try/catch blocks that previously hand-wrote
// status codes and JSON bodies in every route.
// ---------------------------------------------------------------------------

export class AppError extends Error {
  readonly status: number;
  // Optional machine-readable code the client can branch on.
  readonly code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, new.target);
  }
}

// 400 - the request payload is malformed or fails validation.
export class ValidationError extends AppError {
  constructor(message = 'Invalid request', code?: string) {
    super(message, 400, code);
  }
}

// 401 - the caller is not authenticated.
export class AuthError extends AppError {
  constructor(message = 'Authentication required', code?: string) {
    super(message, 401, code);
  }
}

// 403 - authenticated but not allowed to touch this resource.
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, 403, code);
  }
}

// 404 - the requested resource does not exist.
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', code?: string) {
    super(`${resource} not found`, 404, code);
  }
}

// 409 - the request conflicts with current state (e.g. duplicate email).
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code?: string) {
    super(message, 409, code);
  }
}

// 502 - an upstream AI provider failed in a way we couldn't recover from.
export class AIError extends AppError {
  constructor(message = 'AI request failed', code?: string) {
    super(message, 502, code);
  }
}
