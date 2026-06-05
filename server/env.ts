import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from a `.env` file before anything else runs.
// tsx/node do not auto-load `.env`, so we do it explicitly here. The file lives
// in the repo root, but the server runs from `server/`, so we check both.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.ENV_FILE,
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
].filter((p): p is string => Boolean(p));

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

// Fail fast on missing critical secrets. JWT_SECRET signs auth tokens; without
// it the server cannot issue or verify sessions, so refuse to start.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    'FATAL: JWT_SECRET is missing or too short (min 16 chars). Set it in your .env (see .env.example).'
  );
  process.exit(1);
}
