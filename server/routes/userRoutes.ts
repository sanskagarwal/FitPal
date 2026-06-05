import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { UserUpsertSchema } from '../validation.js';

// User routes. A user can only read/write their own record; profile/goal
// updates merge server-side so id, email and the password hash are preserved.
export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.post(
  '/',
  validateBody(UserUpsertSchema),
  requireOwnBody('id'),
  asyncHandler(userController.upsert)
);
userRoutes.get('/:id', requireOwnParam('id'), asyncHandler(userController.get));
userRoutes.put(
  '/:id',
  requireOwnParam('id'),
  validateBody(UserUpsertSchema),
  asyncHandler(userController.upsert)
);
