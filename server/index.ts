import './env.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './ai.js';
import {
  initStorage,
  saveUser,
  getUser,
  getUserByEmail,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
// Storage and static asset locations are configurable so the same build can run
// from a container (with a mounted volume) or directly from source.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..', '..', 'dist');

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// AI proxy routes — Azure OpenAI calls run here so the key stays server-side.
app.use('/api/ai', aiRouter);

// Initialise the SQLite store (creates the DB/schema and imports any legacy
// JSON files from the old file-based store on first run).
initStorage(DATA_DIR);

// User routes
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const user = req.body;
    saveUser(user);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Failed to save user:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = getUser(String(req.params.id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to get user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.get('/api/users/email/:email', async (req: Request, res: Response) => {
  try {
    const user = getUserByEmail(String(req.params.email));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to find user by email:', error);
    res.status(500).json({ error: 'Failed to find user' });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = req.body;
    saveUser({ ...user, id: req.params.id });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Meal routes
app.post('/api/meals', async (req: Request, res: Response) => {
  try {
    const meal = req.body;
    addMeal(meal);
    res.json({ success: true, meal });
  } catch (error) {
    console.error('Failed to save meal:', error);
    res.status(500).json({ error: 'Failed to save meal' });
  }
});

app.get('/api/meals/:userId', async (req: Request, res: Response) => {
  try {
    const meals = getMeals(String(req.params.userId));
    res.json(meals);
  } catch (error) {
    console.error('Failed to get meals:', error);
    res.status(500).json({ error: 'Failed to get meals' });
  }
});

app.put('/api/meals/:id', async (req: Request, res: Response) => {
  try {
    const updatedMeal = req.body;
    const found = updateMeal(String(req.params.id), updatedMeal);
    if (!found) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json({ success: true, meal: updatedMeal });
  } catch (error) {
    console.error('Failed to update meal:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

app.delete('/api/meals/:userId/:id', async (req: Request, res: Response) => {
  try {
    deleteMeal(String(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Weight routes
app.post('/api/weights', async (req: Request, res: Response) => {
  try {
    const weight = req.body;
    addWeight(weight);
    res.json({ success: true, weight });
  } catch (error) {
    console.error('Failed to save weight:', error);
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

app.get('/api/weights/:userId', async (req: Request, res: Response) => {
  try {
    const weights = getWeights(String(req.params.userId));
    res.json(weights);
  } catch (error) {
    console.error('Failed to get weights:', error);
    res.status(500).json({ error: 'Failed to get weights' });
  }
});

app.put('/api/weights/:id', async (req: Request, res: Response) => {
  try {
    const updatedWeight = req.body;
    const found = updateWeight(String(req.params.id), updatedWeight);
    if (!found) {
      return res.status(404).json({ error: 'Weight not found' });
    }
    res.json({ success: true, weight: updatedWeight });
  } catch (error) {
    console.error('Failed to update weight:', error);
    res.status(500).json({ error: 'Failed to update weight' });
  }
});

app.delete('/api/weights/:userId/:id', async (req: Request, res: Response) => {
  try {
    deleteWeight(String(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete weight:', error);
    res.status(500).json({ error: 'Failed to delete weight' });
  }
});

// Notification settings routes
app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    saveNotifications(settings);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Failed to save notification settings:', error);
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

app.get('/api/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const settings = getNotifications(String(req.params.userId));
    res.json(settings || null);
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Streak routes
app.post('/api/streaks', async (req: Request, res: Response) => {
  try {
    const streak = req.body;
    saveStreak(streak);
    res.json({ success: true, streak });
  } catch (error) {
    console.error('Failed to save streak:', error);
    res.status(500).json({ error: 'Failed to save streak' });
  }
});

app.get('/api/streaks/:userId', async (req: Request, res: Response) => {
  try {
    const streak = getStreak(String(req.params.userId));
    res.json(streak || null);
  } catch (error) {
    console.error('Failed to get streak:', error);
    res.status(500).json({ error: 'Failed to get streak' });
  }
});

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
