import { Router } from 'express';
import { pushSubscriptionController } from '../controllers/pushSubscriptionController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireOwnParam } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { z } from 'zod';

const SubscribeSchema = z.object({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().min(1),
});

export const pushSubscriptionRoutes = Router();

// Public - no auth needed to fetch the VAPID public key (client needs it before subscription).
pushSubscriptionRoutes.get('/vapid-public-key', pushSubscriptionController.getVapidPublicKey);

pushSubscriptionRoutes.use(requireAuth);

pushSubscriptionRoutes.post(
  '/:userId/subscribe',
  requireOwnParam('userId'),
  validateBody(SubscribeSchema),
  asyncHandler(pushSubscriptionController.subscribe)
);

pushSubscriptionRoutes.post(
  '/:userId/unsubscribe',
  requireOwnParam('userId'),
  validateBody(UnsubscribeSchema),
  asyncHandler(pushSubscriptionController.unsubscribe)
);
