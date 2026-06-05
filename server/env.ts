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
