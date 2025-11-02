# FitPal Developer Documentation 🛠️

Complete guide for developers to set up, run, and extend FitPal.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Architecture](#project-architecture)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Adding New Features](#adding-new-features)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Optional
- **Azure OpenAI Account** with GPT-4o deployment
  - Required for AI-powered features (food search, recipes, suggestions)
  - App works with mock data without it for development

### System Requirements
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 500MB for dependencies
- **OS:** macOS, Linux, or Windows

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FitPal
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Azure OpenAI Configuration (Optional for development)
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
VITE_AZURE_OPENAI_KEY=your_api_key_here
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o

# API Configuration
VITE_API_URL=http://localhost:3001/api
```

### Azure OpenAI Setup (Optional)

1. **Create Azure OpenAI Resource:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Create a new Azure OpenAI resource
   - You may need to [request access](https://aka.ms/oai/access) first

2. **Deploy GPT-4o Model:**
   - Open Azure OpenAI Studio
   - Go to "Deployments"
   - Create a new deployment
   - Select "gpt-4o" as the model
   - Note the deployment name

3. **Get Credentials:**
   - In Azure Portal, go to your OpenAI resource
   - Navigate to "Keys and Endpoint"
   - Copy the endpoint URL and API key
   - Add them to your `.env` file

### Server Configuration

The server runs on port 3001 by default. To change:

Edit `server/index.ts`:
```typescript
const PORT = process.env.PORT || 3001;
```

## Running the Application

### Development Mode

#### Option 1: Run Both (Recommended)
```bash
npm run dev:all
```
This starts both frontend and backend concurrently.

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

#### Option 2: Run Separately
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend  
npm run server
```

### Available Scripts

**Frontend:**
```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

**Backend:**
```bash
npm run server    # Start backend server (runs: cd server && npm run dev)
```

**In server/ directory:**
```bash
npm run dev       # Start with hot reload (tsx watch)
npm run build     # Compile TypeScript to JavaScript
npm start         # Run compiled version
```

## Project Architecture

### Directory Structure

```
FitPal/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   │   ├── AuthPage.tsx        # Login/Registration
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── FoodLogger.tsx      # Food logging
│   │   ├── WeightTracker.tsx   # Weight tracking
│   │   ├── Goals.tsx           # Goal management
│   │   ├── Recipes.tsx         # Recipe suggestions
│   │   ├── Profile.tsx         # User profile
│   │   └── Layout.tsx          # App layout
│   ├── context/                # React Context
│   │   └── AuthContext.tsx     # Authentication state
│   ├── services/               # External services
│   │   └── openai.ts          # Azure OpenAI integration
│   ├── utils/                  # Utility functions
│   │   ├── db.ts              # API client for backend
│   │   ├── helpers.ts         # Helper functions
│   │   └── exportImport.ts    # Data export/import
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts           # All type interfaces
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
├── server/                     # Backend server
│   ├── index.ts               # Express server
│   ├── data/                  # JSON file storage
│   │   ├── user-*.json       # User profiles
│   │   ├── meals-*.json      # Meal logs
│   │   ├── weights-*.json    # Weight logs
│   │   ├── notifications-*.json # Settings
│   │   └── streak-*.json     # Streak data
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # Backend TS config
├── public/                     # Static assets
├── index.html                  # HTML template
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── package.json               # Frontend dependencies
├── .env                       # Environment variables (not in git)
├── .env.example               # Environment template
├── README.md                  # Project overview
├── FEATURES.md                # Feature documentation
└── DEVELOPER.md               # This file
```

### Tech Stack

**Frontend:**
- React 18.2.0 - UI framework
- TypeScript 5.2.2 - Type safety
- Vite 5.0.8 - Build tool and dev server
- Tailwind CSS 3.3.6 - Styling
- React Router 6.20.0 - Navigation
- Recharts 2.10.3 - Data visualization
- Lucide React 0.292.0 - Icons
- date-fns 3.0.0 - Date utilities
- Vite PWA Plugin 0.17.4 - Progressive Web App

**Backend:**
- Express 4.18.2 - Web framework
- TypeScript 5.3.3 - Type safety
- CORS 2.8.5 - Cross-origin requests
- tsx 4.7.0 - TypeScript execution

**AI Integration:**
- Azure OpenAI Service - GPT-4o model

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication
No authentication required. User identification via `userId` in requests.

---

### User Endpoints

#### Create User
```http
POST /api/users
Content-Type: application/json

{
  "id": "string",
  "name": "string",
  "email": "string",
  "password": "string",
  "age": number,
  "gender": "male" | "female",
  "height": number,
  "currentWeight": number,
  "activityLevel": "sedentary" | "light" | "moderate" | "active" | "very_active",
  "goals": {
    "targetWeight": number,
    "dailyCalories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* user object */ }
}
```

#### Get User by ID
```http
GET /api/users/:id
```

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  // ... rest of user data
}
```

#### Get User by Email
```http
GET /api/users/email/:email
```

**Response:** Same as Get User by ID

#### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  // Updated user object
}
```

**Response:**
```json
{
  "success": true,
  "user": { /* updated user object */ }
}
```

---

### Meal Endpoints

#### Create Meal
```http
POST /api/meals
Content-Type: application/json

{
  "id": "string",
  "userId": "string",
  "date": "ISO 8601 date string",
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "foods": [
    {
      "name": "string",
      "quantity": number,
      "unit": "string"
    }
  ],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "fiber": number,
    "vitaminA": number,
    "vitaminC": number,
    "vitaminD": number,
    "calcium": number,
    "iron": number,
    "magnesium": number,
    "potassium": number
  },
  "notes": "string"
}
```

**Response:**
```json
{
  "success": true,
  "meal": { /* meal object */ }
}
```

#### Get All Meals for User
```http
GET /api/meals/:userId
```

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "date": "string",
    // ... rest of meal data
  }
]
```

#### Update Meal
```http
PUT /api/meals/:id
Content-Type: application/json

{
  // Updated meal object including userId
}
```

**Response:**
```json
{
  "success": true,
  "meal": { /* updated meal object */ }
}
```

#### Delete Meal
```http
DELETE /api/meals/:userId/:id
```

**Response:**
```json
{
  "success": true
}
```

---

### Weight Endpoints

#### Create Weight Entry
```http
POST /api/weights
Content-Type: application/json

{
  "id": "string",
  "userId": "string",
  "date": "ISO 8601 date string",
  "weight": number,
  "bmi": number,
  "bodyFat": number,
  "notes": "string"
}
```

**Response:**
```json
{
  "success": true,
  "weight": { /* weight object */ }
}
```

#### Get All Weights for User
```http
GET /api/weights/:userId
```

**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "date": "string",
    "weight": number,
    // ... rest of weight data
  }
]
```

#### Update Weight Entry
```http
PUT /api/weights/:id
Content-Type: application/json

{
  // Updated weight object including userId
}
```

**Response:**
```json
{
  "success": true,
  "weight": { /* updated weight object */ }
}
```

#### Delete Weight Entry
```http
DELETE /api/weights/:userId/:id
```

**Response:**
```json
{
  "success": true
}
```

---

### Notification Settings Endpoints

#### Save Notification Settings
```http
POST /api/notifications
Content-Type: application/json

{
  "userId": "string",
  "enabled": boolean,
  "times": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "settings": { /* settings object */ }
}
```

#### Get Notification Settings
```http
GET /api/notifications/:userId
```

**Response:**
```json
{
  "userId": "string",
  "enabled": boolean,
  "times": ["string"]
}
```

---

### Streak Endpoints

#### Save Streak Data
```http
POST /api/streaks
Content-Type: application/json

{
  "userId": "string",
  "currentStreak": number,
  "longestStreak": number,
  "lastLogDate": "ISO 8601 date string"
}
```

**Response:**
```json
{
  "success": true,
  "streak": { /* streak object */ }
}
```

#### Get Streak Data
```http
GET /api/streaks/:userId
```

**Response:**
```json
{
  "userId": "string",
  "currentStreak": number,
  "longestStreak": number,
  "lastLogDate": "string"
}
```

---

### Health Check

#### Server Health
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "FitPal server is running"
}
```

---

### Error Responses

All endpoints may return error responses:

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to perform operation"
}
```

## Database Schema

### Data Storage
FitPal uses file-based JSON storage. Each user's data is stored in separate files in `server/data/`:

### File Naming Convention
- `user-{userId}.json` - User profile
- `meals-{userId}.json` - Array of meal entries
- `weights-{userId}.json` - Array of weight entries
- `notifications-{userId}.json` - Notification settings
- `streak-{userId}.json` - Streak tracking data

### Data Models

#### User
```typescript
interface User {
  id: string;                    // Unique user ID (timestamp-based)
  name: string;                  // Full name
  email: string;                 // Email address
  password: string;              // SHA-256 hashed password
  age: number;                   // Age in years
  gender: 'male' | 'female';    // Gender
  height: number;                // Height in cm
  currentWeight: number;         // Current weight in kg
  activityLevel: ActivityLevel;  // Activity level
  goals: Goals;                  // Nutrition goals
}

type ActivityLevel = 
  | 'sedentary'    // Little to no exercise
  | 'light'        // Exercise 1-3 days/week
  | 'moderate'     // Exercise 3-5 days/week
  | 'active'       // Exercise 6-7 days/week
  | 'very_active'; // Exercise twice per day

interface Goals {
  targetWeight: number;    // Target weight in kg (0 = not set)
  dailyCalories: number;   // Daily calorie target
  protein: number;         // Daily protein target (g)
  carbs: number;          // Daily carbs target (g)
  fats: number;           // Daily fats target (g)
  fiber: number;          // Daily fiber target (g)
}
```

#### Meal Entry
```typescript
interface MealEntry {
  id: string;                  // Unique meal ID
  userId: string;              // User ID
  date: string;                // ISO 8601 date string
  mealType: MealType;          // Type of meal
  foods: FoodItem[];           // List of foods
  nutrition: NutritionInfo;    // Total nutrition
  notes?: string;              // Optional notes
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  name: string;       // Food name
  quantity: number;   // Quantity (serving size multiplier)
  unit: string;       // Unit of measurement
}

interface NutritionInfo {
  calories: number;    // kcal
  protein: number;     // g
  carbs: number;       // g
  fats: number;        // g
  fiber: number;       // g
  vitaminA: number;    // μg
  vitaminC: number;    // mg
  vitaminD: number;    // μg
  calcium: number;     // mg
  iron: number;        // mg
  magnesium: number;   // mg
  potassium: number;   // mg
}
```

#### Weight Entry
```typescript
interface WeightEntry {
  id: string;          // Unique weight entry ID
  userId: string;      // User ID
  date: string;        // ISO 8601 date string
  weight: number;      // Weight in kg
  bmi: number;         // Calculated BMI
  bodyFat?: number;    // Optional body fat %
  notes?: string;      // Optional notes
}
```

#### Notification Settings
```typescript
interface NotificationSettings {
  userId: string;      // User ID
  enabled: boolean;    // Notifications enabled
  times: string[];     // Array of notification times
}
```

#### Streak Data
```typescript
interface StreakData {
  userId: string;          // User ID
  currentStreak: number;   // Current consecutive days
  longestStreak: number;   // Longest streak ever
  lastLogDate: string;     // Last weight log date
}
```

## Adding New Features

### Adding a New Component

1. **Create component file:**
```bash
touch src/components/NewFeature.tsx
```

2. **Component template:**
```typescript
import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function NewFeature() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        New Feature
      </h1>
      {/* Your content */}
    </div>
  );
}
```

3. **Add route in App.tsx:**
```typescript
import NewFeature from './components/NewFeature';

// In Routes:
<Route path="/new-feature" element={<NewFeature />} />
```

4. **Add navigation in Layout.tsx:**
```typescript
{
  name: 'New Feature',
  href: '/new-feature',
  icon: IconName
}
```

### Adding a New API Endpoint

1. **Edit server/index.ts:**
```typescript
app.post('/api/newresource', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    await writeJSONFile(`newresource-${data.userId}.json`, data);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});
```

2. **Add corresponding function in src/utils/db.ts:**
```typescript
export async function saveNewResource(data: NewResourceType) {
  const response = await fetch(`${API_URL}/newresource`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

3. **Add TypeScript types in src/types/index.ts:**
```typescript
export interface NewResourceType {
  id: string;
  userId: string;
  // ... other fields
}
```

### Adding a New AI Feature

1. **Add function in src/services/openai.ts:**
```typescript
export async function newAIFeature(prompt: string): Promise<string> {
  // Follow pattern from existing functions
  const systemPrompt = "Your system prompt...";
  const userPrompt = `User query: ${prompt}`;
  
  const result = await callOpenAI(systemPrompt, userPrompt);
  return result;
}
```

2. **Use in component:**
```typescript
import { newAIFeature } from '../services/openai';

const result = await newAIFeature(userInput);
```

## Building for Production

### Frontend Build

```bash
npm run build
```

Output: `dist/` directory

### Backend Build

```bash
cd server
npm run build
```

Output: `server/dist/` directory

### Running Production Build

```bash
# Serve frontend (using any static server)
npx serve -s dist -l 5173

# Run backend
cd server
npm start
```

### Deployment Options

**Frontend:**
- Vercel
- Netlify
- GitHub Pages
- Azure Static Web Apps
- Any static hosting service

**Backend:**
- Heroku
- Railway
- Render
- DigitalOcean
- AWS EC2
- Azure App Service

### Environment Variables for Production

Update `.env` for production:
```env
VITE_AZURE_OPENAI_ENDPOINT=<production-endpoint>
VITE_AZURE_OPENAI_KEY=<production-key>
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
VITE_API_URL=https://your-backend-domain.com/api
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -ti:5173  # or :3001 for backend
kill -9 <PID>

# Or use different ports
PORT=5174 npm run dev
```

#### Dependencies Not Installing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Azure OpenAI Not Working
- Verify endpoint URL format: `https://xxx.openai.azure.com`
- Check API key is correct
- Ensure deployment name matches
- Verify model is deployed in Azure
- Check Azure OpenAI quotas

#### CORS Errors
- Ensure backend is running
- Check `VITE_API_URL` in `.env`
- Verify CORS is enabled in server

#### Data Not Persisting
- Check `server/data/` directory exists
- Verify file permissions
- Check server logs for errors
- Ensure userId is consistent

### Debugging

#### Frontend Debugging
```bash
# Enable verbose logging
npm run dev -- --debug

# Check browser console (F12)
```

#### Backend Debugging
```bash
# Add console.logs in server/index.ts
console.log('Request received:', req.body);

# Check server output
npm run server
```

#### Network Debugging
- Use browser DevTools Network tab
- Check API request/response
- Verify request headers and body

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Create new issue with:
   - FitPal version
   - Node.js version
   - Error messages
   - Steps to reproduce

## Best Practices

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Use functional components
- Keep components small and focused
- Extract reusable logic to utils

### State Management
- Use React Context for global state
- Local state for component-specific data
- Avoid prop drilling

### Performance
- Lazy load components when possible
- Memoize expensive calculations
- Optimize re-renders with React.memo
- Use proper keys in lists

### Security
- Never commit `.env` file
- Hash passwords before storing
- Validate user input
- Sanitize data before storing

### Data Management
- Always include userId in data
- Use ISO 8601 for dates
- Validate data before saving
- Handle errors gracefully

---

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Azure OpenAI Docs](https://learn.microsoft.com/en-us/azure/ai-services/openai/)

---

**Happy Coding!** 🚀

If you have questions or need help, feel free to open an issue on GitHub.
