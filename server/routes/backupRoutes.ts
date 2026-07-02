import { Router } from 'express';
import { backupController } from '../controllers/backupController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

export const backupRoutes = Router();

backupRoutes.use(requireAuth);

backupRoutes.get('/', asyncHandler(backupController.download));
