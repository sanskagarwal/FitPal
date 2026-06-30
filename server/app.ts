import { config } from './env.js';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Static asset location is configurable so the same build can run from a
  // container (mounted volume) or directly from source.
  const STATIC_DIR = config.STATIC_DIR || path.join(__dirname, '..', '..', 'dist');

  // Security headers. helmet's defaults cover X-Frame-Options, X-Content-Type-Options,
  // HSTS, Referrer-Policy etc. CSP is tuned for the app's needs:
  //   - unsafe-inline for scripts: required by the theme-detection inline script in index.html
  //   - unsafe-inline for styles: required by Tailwind v4's runtime style injection
  //   - data:/blob: for images: meal photos are served as data URLs
  //   - worker-src: PWA service worker
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  // Middleware. `credentials: true` lets the browser send the auth cookie on
  // cross-origin (split-deployment) requests; same-origin works regardless.
  app.use(cors({ origin: true, credentials: true }));
  // Correlation id + structured request logging - first so every downstream
  // handler and the error handler share the request id.
  app.use(requestLogger);
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

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

  // Central error handler - registered last so it catches everything above.
  app.use(errorHandler);

  return app;
}
