import { Request, Response } from 'express';
import { mealService } from '../services/mealService.js';
import { normalizeImageDataUrl } from '../services/imageService.js';
import { type MealRecord } from '../repositories/mealRepository.js';
import { NotFoundError } from '../errors.js';

export const mealController = {
  async create(req: Request, res: Response): Promise<void> {
    // The image is transient: normalize it, store it in meal_images, and keep
    // only a hasImage flag on the meal JSON (strip the raw data URL before save).
    const { image, ...rest } = req.body as { image?: string } & MealRecord;
    const meal = rest as MealRecord;
    if (image) {
      const normalized = await normalizeImageDataUrl(image);
      meal.hasImage = true;
      const saved = mealService.create(meal, {
        mime: normalized.mime,
        buffer: normalized.buffer,
      });
      res.json({ success: true, meal: saved });
      return;
    }
    const saved = mealService.create(meal);
    res.json({ success: true, meal: saved });
  },

  async list(req: Request, res: Response): Promise<void> {
    res.json(mealService.listByUser(String(req.params.userId)));
  },

  async listRange(req: Request, res: Response): Promise<void> {
    const { start, end } = res.locals.query as { start: string; end: string };
    res.json(mealService.listByUserInRange(String(req.params.userId), start, end));
  },

  async getImage(req: Request, res: Response): Promise<void> {
    const found = mealService.getImage(String(req.params.id), String(req.params.userId));
    if (!found) {
      throw new NotFoundError('Meal image');
    }
    // Serve the bytes so the browser renders but never executes them, and never
    // sniffs a different type. The image is private user data, so cache only in
    // the user's own browser.
    res.setHeader('Content-Type', found.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline; filename="meal.jpg"');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(found.image);
  },

  async update(req: Request, res: Response): Promise<void> {
    // Image editing is not supported on update; drop any transient image so the
    // raw data URL is never persisted into the meal JSON.
    const meal = { ...(req.body as MealRecord & { image?: string }) };
    delete meal.image;
    const updated = mealService.update(String(req.params.id), req.userId!, meal);
    res.json({ success: true, meal: updated });
  },

  async remove(req: Request, res: Response): Promise<void> {
    mealService.delete(String(req.params.id), req.userId!);
    res.json({ success: true });
  },
};
