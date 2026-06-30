import { Request, Response } from 'express';
import { waterService } from '../services/waterService.js';

export const waterController = {
  async create(req: Request, res: Response): Promise<void> {
    const entry = waterService.create(req.body);
    res.json({ success: true, entry });
  },

  async listByDate(req: Request, res: Response): Promise<void> {
    const { date } = res.locals.query as { date: string };
    res.json(waterService.listByDate(String(req.params.userId), date));
  },

  async remove(req: Request, res: Response): Promise<void> {
    waterService.delete(String(req.params.id), req.userId!);
    res.json({ success: true });
  },
};
