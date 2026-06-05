import { config } from './env.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initStorage } from './storage.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Application entry point — wiring only.
//
// Route handlers live in routes/ → controllers/ → services/ → repositories/.
// This file just configures middleware, mounts the API router, serves the
// built SPA, and registers the central error handler last.
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.PORT;
// Storage and static asset locations are configurable so the same build can run
// from a container (with a mounted volume) or directly from source.
const DATA_DIR = config.DATA_DIR || path.join(__dirname, 'data');
const STATIC_DIR = config.STATIC_DIR || path.join(__dirname, '..', '..', 'dist');

// Middleware. `credentials: true` lets the browser send the auth cookie on
// cross-origin (split-deployment) requests; same-origin works regardless.
app.use(cors({ origin: true, credentials: true }));
// Correlation id + structured request logging — first so every downstream
// handler and the error handler share the request id.
app.use(requestLogger);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Initialise the SQLite store (creates the DB/schema and seeds the nutrition
// cache) before any request can hit a repository.
initStorage(DATA_DIR);

// All API routes live under /api.
app.use('/api', apiRouter);

// Serve the built frontend (single-process production deployment). The SPA
// fallback returns index.html for any non-API, non-file route so client-side
// routing works on refresh/deep links.
if (fsSync.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

// Central error handler — registered last so it catches everything above.
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('FitPal server started', { port: PORT, url: `http://localhost:${PORT}` });
});
