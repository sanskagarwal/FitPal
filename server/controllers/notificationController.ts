import { Request, Response } from 'express';
import { notificationService } from '../services/notificationService.js';

export const notificationController = {
  async save(req: Request, res: Response): Promise<void> {
    const settings = notificationService.save(req.body);
    res.json({ success: true, settings });
  },

  async get(req: Request, res: Response): Promise<void> {
    res.json(notificationService.get(String(req.params.userId)) || null);
  },
};
