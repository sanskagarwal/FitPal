import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initStorage } from './storage.js';
import { createApp } from './app.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Application entry point - process bootstrap only.
//
// The Express app itself is assembled in app.ts (`createApp`). Here we open the
// storage layer and bind the port. App construction is deliberately kept out of
// this file so integration tests can build the app without starting a server.
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = config.PORT;
// Storage location is configurable so the same build can run from a container
// (with a mounted volume) or directly from source.
const DATA_DIR = config.DATA_DIR || path.join(__dirname, 'data');

// Initialise the SQLite store (creates the DB/schema and seeds the nutrition
// cache) before any request can hit a repository.
initStorage(DATA_DIR);

const app = createApp();

app.listen(PORT, () => {
  logger.info('FitPal server started', { port: PORT, url: `http://localhost:${PORT}` });
});
