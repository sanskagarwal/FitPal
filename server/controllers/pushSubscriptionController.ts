import { Request, Response } from 'express';
import { config } from '../env.js';
import { pushSubscriptionService } from '../services/pushSubscriptionService.js';

export const pushSubscriptionController = {
  getVapidPublicKey(_req: Request, res: Response): void {
    const key = config.VAPID_PUBLIC_KEY;
    if (!key) {
      res.status(503).json({ error: 'Push notifications not configured on this server.' });
      return;
    }
    res.json({ publicKey: key });
  },

  async subscribe(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.userId);
    const { endpoint, p256dh, auth } = req.body as {
      endpoint: string;
      p256dh: string;
      auth: string;
    };
    const record = pushSubscriptionService.save(userId, { endpoint, p256dh, auth });
    res.json({ success: true, id: record.id });
  },

  async unsubscribe(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.userId);
    const { endpoint } = req.body as { endpoint: string };
    pushSubscriptionService.deleteByEndpoint(userId, endpoint);
    res.json({ success: true });
  },
};
