import { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { setAuthCookie, clearAuthCookie } from '../auth.js';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password, profile } = req.body;
    const { user, userId } = await authService.register({ name, email, password, profile });
    setAuthCookie(res, userId);
    res.json({ success: true, user });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const { user, userId } = await authService.login(email, password);
    setAuthCookie(res, userId);
    res.json({ success: true, user });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.json({ success: true });
  },

  async me(req: Request, res: Response): Promise<void> {
    res.json(authService.getMe(req.userId!));
  },
};
