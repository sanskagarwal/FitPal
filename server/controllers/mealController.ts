import { Request, Response } from 'express';
import { mealService } from '../services/mealService.js';

export const mealController = {
  async create(req: Request, res: Response): Promise<void> {
    const meal = mealService.create(req.body);
    res.json({ success: true, meal });
  },

  async list(req: Request, res: Response): Promise<void> {
    res.json(mealService.listByUser(String(req.params.userId)));
  },

  async update(req: Request, res: Response): Promise<void> {
    const meal = mealService.update(String(req.params.id), req.userId!, req.body);
    res.json({ success: true, meal });
  },

  async remove(req: Request, res: Response): Promise<void> {
    mealService.delete(String(req.params.id), req.userId!);
    res.json({ success: true });
  },
};
