import { Router } from 'express';
import { weightController } from '../controllers/weightController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { WeightSchema, DateRangeQuerySchema } from '../validation.js';

export const weightRoutes = Router();

weightRoutes.use(requireAuth);

weightRoutes.post(
  '/',
  validateBody(WeightSchema),
  requireOwnBody('userId'),
  asyncHandler(weightController.create)
);
weightRoutes.get(
  '/:userId/range',
  requireOwnParam('userId'),
  validateQuery(DateRangeQuerySchema),
  asyncHandler(weightController.listRange)
);
weightRoutes.get('/:userId', requireOwnParam('userId'), asyncHandler(weightController.list));
weightRoutes.put(
  '/:id',
  validateBody(WeightSchema),
  requireOwnBody('userId'),
  asyncHandler(weightController.update)
);
weightRoutes.delete(
  '/:userId/:id',
  requireOwnParam('userId'),
  asyncHandler(weightController.remove)
);
