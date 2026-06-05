import { Request, Response } from 'express';
import { streakService } from '../services/streakService.js';

export const streakController = {
  async save(req: Request, res: Response): Promise<void> {
    const streak = streakService.save(req.body);
    res.json({ success: true, streak });
  },

  async get(req: Request, res: Response): Promise<void> {
    res.json(streakService.get(String(req.params.userId)) || null);
  },
};
