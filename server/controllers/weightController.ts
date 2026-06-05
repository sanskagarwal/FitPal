import { Request, Response } from 'express';
import { weightService } from '../services/weightService.js';

export const weightController = {
  async create(req: Request, res: Response): Promise<void> {
    const weight = weightService.create(req.body);
    res.json({ success: true, weight });
  },

  async list(req: Request, res: Response): Promise<void> {
    res.json(weightService.listByUser(String(req.params.userId)));
  },

  async update(req: Request, res: Response): Promise<void> {
    const weight = weightService.update(String(req.params.id), req.userId!, req.body);
    res.json({ success: true, weight });
  },

  async remove(req: Request, res: Response): Promise<void> {
    weightService.delete(String(req.params.id), req.userId!);
    res.json({ success: true });
  },
};
