import { Request, Response } from 'express';
import { userService } from '../services/userService.js';

export const userController = {
  async get(req: Request, res: Response): Promise<void> {
    // Ownership is enforced by requireOwnParam; read by the session user's id.
    res.json(userService.getOwn(req.userId!));
  },

  async upsert(req: Request, res: Response): Promise<void> {
    const user = userService.upsertOwn(req.userId!, req.body);
    res.json({ success: true, user });
  },
};
