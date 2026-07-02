import { Request, Response } from 'express';
import { backupService } from '../services/backupService.js';
import { userRepository } from '../repositories/userRepository.js';
import { ValidationError } from '../errors.js';
import { RestoreModeSchema } from '../validation.js';

export const backupController = {
  async download(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const { buffer, filename, exportedAt } = await backupService.buildZip(userId);
    userRepository.setLastBackupAt(userId, exportedAt);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  },

  async restore(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    if (!req.file) {
      throw new ValidationError('file - a ZIP backup file is required');
    }

    const modeResult = RestoreModeSchema.safeParse((req.body as Record<string, unknown>)?.mode);
    if (!modeResult.success) {
      throw new ValidationError('mode - must be "merge" or "replace"');
    }

    const result = await backupService.restore(userId, req.file.buffer, modeResult.data);
    res.json(result);
  },
};
