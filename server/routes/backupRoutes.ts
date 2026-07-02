import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { backupController } from '../controllers/backupController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { ValidationError } from '../errors.js';
import { MAX_RESTORE_UPLOAD_BYTES } from '../services/backupService.js';

export const backupRoutes = Router();

backupRoutes.use(requireAuth);

backupRoutes.get('/', asyncHandler(backupController.download));

// Memory storage: the ZIP is small enough to hold in RAM (bounded by
// limits.fileSize below) and backupService needs the whole buffer anyway to
// hand off to JSZip.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESTORE_UPLOAD_BYTES },
});

// Wraps multer so a rejected upload (e.g. LIMIT_FILE_SIZE) surfaces as the
// same 400 ValidationError shape as every other validation failure, instead
// of the central handler's generic 500 fallback (MulterError has a `.code`
// but no `.status`/`.statusCode`).
function uploadZip(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      next(new ValidationError(`file - ${err.message}`));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

backupRoutes.post('/restore', uploadZip, asyncHandler(backupController.restore));
