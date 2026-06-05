import './env.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './ai.js';
import {
  initStorage,
  saveUser,
  getUserRecordById,
  getUserRecordByEmail,
  emailExists,
  toPublicUser,
  type StoredUser,
  addMeal,
  getMeals,
  updateMeal,
  deleteMeal,
  addWeight,
  getWeights,
  updateWeight,
  deleteWeight,
  saveNotifications,
  getNotifications,
  saveStreak,
  getStreak,
} from './storage.js';
import { validateMeal } from './validation.js';
import { aiRateLimit } from './rateLimit.js';
import {
  hashPassword,
  verifyPassword,
  isLegacyHash,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireOwnParam,
  requireOwnBody,
} from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
// Storage and static asset locations are configurable so the same build can run
// from a container (with a mounted volume) or directly from source.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'dist');

// Middleware. `credentials: true` lets the browser send the auth cookie on
// cross-origin (split-deployment) requests; same-origin works regardless.
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Initialise the SQLite store (creates the DB/schema and imports any legacy
// JSON files from the old file-based store on first run).
initStorage(DATA_DIR);

// ---------------------------------------------------------------------------
// Auth routes (public). Passwords are hashed server-side; the session is a
// signed JWT in an httpOnly cookie. Responses never include the password hash.
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, profile } = req.body ?? {};
    if (!name || !email || !password || !profile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (emailExists(String(email))) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    const user: StoredUser = {
      id: randomUUID(),
      name,
      email,
      password: await hashPassword(String(password)),
      createdAt: new Date().toISOString(),
      profile,
    };
    saveUser(user);
    setAuthCookie(res, user.id);
    res.json({ success: true, user: toPublicUser(user) });
  } catch (error) {
    console.error('Failed to register user:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const record = getUserRecordByEmail(String(email));
    if (!record) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Legacy unsalted SHA-256 accounts must set a new password once (the old
    // hash can never verify under bcrypt).
    if (isLegacyHash(record.password)) {
      return res
        .status(409)
        .json({ error: 'Please reset your password to continue', code: 'legacy_password' });
    }
    const valid = await verifyPassword(String(password), record.password ?? '');
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    setAuthCookie(res, record.id);
    res.json({ success: true, user: toPublicUser(record) });
  } catch (error) {
    console.error('Failed to log in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const record = getUserRecordById(req.userId!);
  if (!record) {
    clearAuthCookie(res);
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(toPublicUser(record));
});

// One-time migration path for legacy SHA-256 accounts: lets a user set a new
// bcrypt password. Restricted to accounts still on the legacy hash so it can't
// be used to take over already-migrated accounts.
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }
    const record = getUserRecordByEmail(String(email));
    if (!record) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!isLegacyHash(record.password)) {
      return res.status(403).json({ error: 'Password reset is not available for this account' });
    }
    const updated: StoredUser = { ...record, password: await hashPassword(String(password)) };
    saveUser(updated);
    setAuthCookie(res, updated.id);
    res.json({ success: true, user: toPublicUser(updated) });
  } catch (error) {
    console.error('Failed to reset password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// AI proxy routes — Azure OpenAI calls run here so the key stays server-side.
// Auth-gated (no anonymous access) then rate-limited (the only billed routes).
app.use('/api/ai', requireAuth, aiRateLimit, aiRouter);

// ---------------------------------------------------------------------------
// User routes (authenticated; a user can only read/write their own record).
// Profile/goal updates merge into the stored record so the server-managed
// password hash is preserved and never overwritten by the client.
// ---------------------------------------------------------------------------
function upsertOwnUser(req: Request, res: Response): void {
  const id = req.userId!;
  const existing = getUserRecordById(id);
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const merged: StoredUser = {
    ...existing,
    ...req.body,
    id,
    email: existing.email,
    password: existing.password,
  };
  saveUser(merged);
  res.json({ success: true, user: toPublicUser(merged) });
}

app.post('/api/users', requireAuth, requireOwnBody('id'), (req: Request, res: Response) => {
  try {
    upsertOwnUser(req, res);
  } catch (error) {
    console.error('Failed to save user:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.get('/api/users/:id', requireAuth, requireOwnParam('id'), (req: Request, res: Response) => {
  try {
    const user = toPublicUser(getUserRecordById(String(req.params.id)));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to get user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.put('/api/users/:id', requireAuth, requireOwnParam('id'), (req: Request, res: Response) => {
  try {
    upsertOwnUser(req, res);
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Meal routes
app.post('/api/meals', requireAuth, requireOwnBody('userId'), (req: Request, res: Response) => {
  try {
    const meal = req.body;
    const check = validateMeal(meal);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }
    addMeal(meal);
    res.json({ success: true, meal });
  } catch (error) {
    console.error('Failed to save meal:', error);
    res.status(500).json({ error: 'Failed to save meal' });
  }
});

app.get('/api/meals/:userId', requireAuth, requireOwnParam('userId'), (req: Request, res: Response) => {
  try {
    const meals = getMeals(String(req.params.userId));
    res.json(meals);
  } catch (error) {
    console.error('Failed to get meals:', error);
    res.status(500).json({ error: 'Failed to get meals' });
  }
});

app.put('/api/meals/:id', requireAuth, requireOwnBody('userId'), (req: Request, res: Response) => {
  try {
    const updatedMeal = req.body;
    const check = validateMeal(updatedMeal);
    if (!check.ok) {
      return res.status(400).json({ error: check.error });
    }
    const found = updateMeal(String(req.params.id), updatedMeal, req.userId!);
    if (!found) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json({ success: true, meal: updatedMeal });
  } catch (error) {
    console.error('Failed to update meal:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

app.delete(
  '/api/meals/:userId/:id',
  requireAuth,
  requireOwnParam('userId'),
  (req: Request, res: Response) => {
    try {
      deleteMeal(String(req.params.id), req.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete meal:', error);
      res.status(500).json({ error: 'Failed to delete meal' });
    }
  }
);

// Weight routes
app.post('/api/weights', requireAuth, requireOwnBody('userId'), (req: Request, res: Response) => {
  try {
    const weight = req.body;
    addWeight(weight);
    res.json({ success: true, weight });
  } catch (error) {
    console.error('Failed to save weight:', error);
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

app.get(
  '/api/weights/:userId',
  requireAuth,
  requireOwnParam('userId'),
  (req: Request, res: Response) => {
    try {
      const weights = getWeights(String(req.params.userId));
      res.json(weights);
    } catch (error) {
      console.error('Failed to get weights:', error);
      res.status(500).json({ error: 'Failed to get weights' });
    }
  }
);

app.put('/api/weights/:id', requireAuth, requireOwnBody('userId'), (req: Request, res: Response) => {
  try {
    const updatedWeight = req.body;
    const found = updateWeight(String(req.params.id), updatedWeight, req.userId!);
    if (!found) {
      return res.status(404).json({ error: 'Weight not found' });
    }
    res.json({ success: true, weight: updatedWeight });
  } catch (error) {
    console.error('Failed to update weight:', error);
    res.status(500).json({ error: 'Failed to update weight' });
  }
});

app.delete(
  '/api/weights/:userId/:id',
  requireAuth,
  requireOwnParam('userId'),
  (req: Request, res: Response) => {
    try {
      deleteWeight(String(req.params.id), req.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete weight:', error);
      res.status(500).json({ error: 'Failed to delete weight' });
    }
  }
);

// Notification settings routes
app.post(
  '/api/notifications',
  requireAuth,
  requireOwnBody('userId'),
  (req: Request, res: Response) => {
    try {
      const settings = req.body;
      saveNotifications(settings);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      res.status(500).json({ error: 'Failed to save notification settings' });
    }
  }
);

app.get(
  '/api/notifications/:userId',
  requireAuth,
  requireOwnParam('userId'),
  (req: Request, res: Response) => {
    try {
      const settings = getNotifications(String(req.params.userId));
      res.json(settings || null);
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      res.status(500).json({ error: 'Failed to get notification settings' });
    }
  }
);

// Streak routes
app.post('/api/streaks', requireAuth, requireOwnBody('userId'), (req: Request, res: Response) => {
  try {
    const streak = req.body;
    saveStreak(streak);
    res.json({ success: true, streak });
  } catch (error) {
    console.error('Failed to save streak:', error);
    res.status(500).json({ error: 'Failed to save streak' });
  }
});

app.get(
  '/api/streaks/:userId',
  requireAuth,
  requireOwnParam('userId'),
  (req: Request, res: Response) => {
    try {
      const streak = getStreak(String(req.params.userId));
      res.json(streak || null);
    } catch (error) {
      console.error('Failed to get streak:', error);
      res.status(500).json({ error: 'Failed to get streak' });
    }
  }
);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FitPal server is running' });
});

// Serve the built frontend (single-process production deployment). The SPA
// fallback returns index.html for any non-API, non-file route so client-side
// routing works on refresh/deep links.
if (fsSync.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(STATIC_DIR, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FitPal server running on http://localhost:${PORT}`);
});
