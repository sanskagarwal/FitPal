import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { NotificationSchema } from '../validation.js';

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

notificationRoutes.post(
  '/',
  validateBody(NotificationSchema),
  requireOwnBody('userId'),
  asyncHandler(notificationController.save)
);
notificationRoutes.get(
  '/:userId',
  requireOwnParam('userId'),
  asyncHandler(notificationController.get)
);
