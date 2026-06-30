import { Router } from 'express';
import { waterController } from '../controllers/waterController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { WaterSchema, DateQuerySchema } from '../validation.js';

export const waterRoutes = Router();

waterRoutes.use(requireAuth);

waterRoutes.post(
  '/:userId',
  validateBody(WaterSchema),
  requireOwnBody('userId'),
  asyncHandler(waterController.create)
);
waterRoutes.get(
  '/:userId',
  requireOwnParam('userId'),
  validateQuery(DateQuerySchema),
  asyncHandler(waterController.listByDate)
);
waterRoutes.delete(
  '/:userId/:id',
  requireOwnParam('userId'),
  asyncHandler(waterController.remove)
);
