import { Router } from 'express';
import { mealController } from '../controllers/mealController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam, requireOwnBody } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { MealSchema, DateRangeQuerySchema } from '../validation.js';

export const mealRoutes = Router();

mealRoutes.use(requireAuth);

mealRoutes.post(
  '/',
  validateBody(MealSchema),
  requireOwnBody('userId'),
  asyncHandler(mealController.create)
);
mealRoutes.get(
  '/:userId/range',
  requireOwnParam('userId'),
  validateQuery(DateRangeQuerySchema),
  asyncHandler(mealController.listRange)
);
mealRoutes.get('/:userId', requireOwnParam('userId'), asyncHandler(mealController.list));
mealRoutes.get(
  '/:userId/:id/image',
  requireOwnParam('userId'),
  asyncHandler(mealController.getImage)
);
mealRoutes.put(
  '/:id',
  validateBody(MealSchema),
  requireOwnBody('userId'),
  asyncHandler(mealController.update)
);
mealRoutes.delete('/:userId/:id', requireOwnParam('userId'), asyncHandler(mealController.remove));
