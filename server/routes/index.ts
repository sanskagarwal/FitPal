import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit } from '../rateLimit.js';
import { authRoutes } from './authRoutes.js';
import { userRoutes } from './userRoutes.js';
import { mealRoutes } from './mealRoutes.js';
import { weightRoutes } from './weightRoutes.js';
import { notificationRoutes } from './notificationRoutes.js';
import { streakRoutes } from './streakRoutes.js';
import { aiRoutes } from './aiRoutes.js';

// Assembles the full /api router. AI routes are auth-gated then rate-limited
// (the only externally-billed endpoints); each data sub-router applies its own
// requireAuth + ownership guards.
export const apiRouter = Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FitPal server is running' });
});

apiRouter.use('/ai', requireAuth, aiRateLimit, aiRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/meals', mealRoutes);
apiRouter.use('/weights', weightRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/streaks', streakRoutes);
