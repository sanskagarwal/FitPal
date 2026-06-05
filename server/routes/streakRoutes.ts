import { Router } from 'express';
import { streakController } from '../controllers/streakController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { StreakSchema } from '../validation.js';

export const streakRoutes = Router();

streakRoutes.use(requireAuth);

streakRoutes.post(
  '/',
  validateBody(StreakSchema),
  requireOwnBody('userId'),
  asyncHandler(streakController.save)
);
streakRoutes.get('/:userId', requireOwnParam('userId'), asyncHandler(streakController.get));
