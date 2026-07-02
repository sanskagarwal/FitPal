import { Request, Response } from 'express';
import { backupService } from '../services/backupService.js';
import { userRepository } from '../repositories/userRepository.js';

export const backupController = {
  async download(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const { buffer, filename, exportedAt } = await backupService.buildZip(userId);
    userRepository.setLastBackupAt(userId, exportedAt);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  },
};
