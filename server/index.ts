import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Helper function to read JSON file
async function readJSONFile(filename: string) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

// Helper function to write JSON file
async function writeJSONFile(filename: string, data: any) {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// User routes
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const user = req.body;
    await writeJSONFile(`user-${user.id}.json`, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await readJSONFile(`user-${req.params.id}.json`);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.get('/api/users/email/:email', async (req: Request, res: Response) => {
  try {
    const files = await fs.readdir(DATA_DIR);
    const userFiles = files.filter((f: string) => f.startsWith('user-') && f.endsWith('.json'));
    
    for (const file of userFiles) {
      const user = await readJSONFile(file);
      if (user && user.email === req.params.email) {
        return res.json(user);
      }
    }
    
    res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to find user' });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = req.body;
    await writeJSONFile(`user-${req.params.id}.json`, user);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Meal routes
app.post('/api/meals', async (req: Request, res: Response) => {
  try {
    const meal = req.body;
    const mealsFile = `meals-${meal.userId}.json`;
    let meals = await readJSONFile(mealsFile) || [];
    meals.push(meal);
    await writeJSONFile(mealsFile, meals);
    res.json({ success: true, meal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save meal' });
  }
});

app.get('/api/meals/:userId', async (req: Request, res: Response) => {
  try {
    const meals = await readJSONFile(`meals-${req.params.userId}.json`) || [];
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meals' });
  }
});

app.put('/api/meals/:id', async (req: Request, res: Response) => {
  try {
    const updatedMeal = req.body;
    const mealsFile = `meals-${updatedMeal.userId}.json`;
    let meals = await readJSONFile(mealsFile) || [];
    const index = meals.findIndex((m: any) => m.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    meals[index] = updatedMeal;
    await writeJSONFile(mealsFile, meals);
    res.json({ success: true, meal: updatedMeal });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

app.delete('/api/meals/:userId/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const mealsFile = `meals-${userId}.json`;
    let meals = await readJSONFile(mealsFile) || [];
    meals = meals.filter((m: any) => m.id !== id);
    await writeJSONFile(mealsFile, meals);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Weight routes
app.post('/api/weights', async (req: Request, res: Response) => {
  try {
    const weight = req.body;
    const weightsFile = `weights-${weight.userId}.json`;
    let weights = await readJSONFile(weightsFile) || [];
    weights.push(weight);
    await writeJSONFile(weightsFile, weights);
    res.json({ success: true, weight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save weight' });
  }
});

app.get('/api/weights/:userId', async (req: Request, res: Response) => {
  try {
    const weights = await readJSONFile(`weights-${req.params.userId}.json`) || [];
    res.json(weights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weights' });
  }
});

app.put('/api/weights/:id', async (req: Request, res: Response) => {
  try {
    const updatedWeight = req.body;
    const weightsFile = `weights-${updatedWeight.userId}.json`;
    let weights = await readJSONFile(weightsFile) || [];
    const index = weights.findIndex((w: any) => w.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Weight not found' });
    }
    
    weights[index] = updatedWeight;
    await writeJSONFile(weightsFile, weights);
    res.json({ success: true, weight: updatedWeight });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update weight' });
  }
});

app.delete('/api/weights/:userId/:id', async (req: Request, res: Response) => {
  try {
    const { userId, id } = req.params;
    const weightsFile = `weights-${userId}.json`;
    let weights = await readJSONFile(weightsFile) || [];
    weights = weights.filter((w: any) => w.id !== id);
    await writeJSONFile(weightsFile, weights);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete weight' });
  }
});

// Notification settings routes
app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    await writeJSONFile(`notifications-${settings.userId}.json`, settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save notification settings' });
  }
});

app.get('/api/notifications/:userId', async (req: Request, res: Response) => {
  try {
    const settings = await readJSONFile(`notifications-${req.params.userId}.json`);
    res.json(settings || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Streak routes
app.post('/api/streaks', async (req: Request, res: Response) => {
  try {
    const streak = req.body;
    await writeJSONFile(`streak-${streak.userId}.json`, streak);
    res.json({ success: true, streak });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save streak' });
  }
});

app.get('/api/streaks/:userId', async (req: Request, res: Response) => {
  try {
    const streak = await readJSONFile(`streak-${req.params.userId}.json`);
    res.json(streak || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get streak' });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FitPal server is running' });
});

// Start server
ensureDataDir().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 FitPal server running on http://localhost:${PORT}`);
  });
});
