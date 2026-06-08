import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { DeleteAccountSchema, LoginSchema, RegisterSchema } from '../validation.js';

// Auth routes. Public except `me`, which needs a valid session. Passwords are
// hashed server-side; the session is a signed JWT in an httpOnly cookie.
export const authRoutes = Router();

authRoutes.post('/register', validateBody(RegisterSchema), asyncHandler(authController.register));
authRoutes.post('/login', validateBody(LoginSchema), asyncHandler(authController.login));
authRoutes.post('/logout', asyncHandler(authController.logout));
authRoutes.get('/me', requireAuth, asyncHandler(authController.me));
authRoutes.delete(
  '/account',
  requireAuth,
  validateBody(DeleteAccountSchema),
  asyncHandler(authController.deleteAccount)
);
