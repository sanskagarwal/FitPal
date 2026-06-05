# FitPal Developer Documentation 🛠️

A guide to setting up, running, and extending FitPal.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [AI Integration](#ai-integration)
- [Storage API Reference](#storage-api-reference)
- [Data Models](#data-models)
- [Extending FitPal](#extending-fitpal)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

FitPal has three parts:

1. **Frontend SPA** (`src/`) — React 19 + TypeScript + Vite. All UI, state, and navigation live here. Navigation is **state-based** (a `currentPage` string with a `switch` in `App.tsx`), not React Router.
2. **AI service** (`src/services/openai.ts`) — a thin client that calls the backend `/api/ai/*` routes. The actual AI calls run **server-side** (`server/ai.ts`) via the **Vercel AI SDK**, which talks to any OpenAI-compatible Chat Completions API (OpenAI, LiteLLM, OpenRouter, Ollama, vLLM, Azure OpenAI, …) with **structured outputs** validated by `zod`, so the API key never reaches the browser.
3. **Storage server** (`server/`) — a small **Express 5** app that persists data in a **SQLite** database (`better-sqlite3`) at `server/data/fitpal.db`, serves the built frontend, and proxies AI calls. The frontend talks to it via a REST client in `src/utils/db.ts`.

```
Browser (React SPA) ──HTTP──> Express server ──> server/data/fitpal.db (SQLite)
        │                          │
        │                          └──HTTPS──> AI provider (OpenAI-compatible API, structured outputs)
        └──(served by the same Express process)
```

---

## Prerequisites

- **Node.js 24+** ([download](https://nodejs.org/))
- **npm** (bundled with Node)
- **Git**
- An **AI provider** with an OpenAI-compatible Chat Completions API (OpenAI, LiteLLM, OpenRouter, Ollama, vLLM, Azure OpenAI, …) — required for AI features.

---

## Installation

```bash
git clone <repository-url>
cd FitPal

# Frontend deps
npm install

# Storage server deps
cd server && npm install && cd ..
```

---

## Configuration

Create a `.env` in the project root:

```bash
cp .env.example .env
```

```env
# AI provider (server-side only — never shipped to the browser).
# Works with any OpenAI-compatible Chat Completions API.
AI_API_KEY=your-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
# To use Azure OpenAI instead, set AI_PROVIDER=azure with AI_BASE_URL as the
# resource endpoint, AI_MODEL as the deployment name, and AI_API_VERSION set.
# AI_PROVIDER=azure
# AI_API_VERSION=2024-08-01-preview

# Storage server base URL (frontend → server)
VITE_API_URL=http://localhost:3001/api
```

> Only `VITE_`-prefixed variables are exposed to the frontend. The `AI_*` variables are read by the server only, so the API key never reaches the browser.

### Storage server port

The server defaults to port `3001`. Override with the `PORT` env var or edit `server/index.ts`:

```ts
const PORT = process.env.PORT || 3001;
```

---

## Running the App

### Both together (recommended)

```bash
npm run dev:all
```

- Frontend → http://localhost:5173
- Storage server → http://localhost:3001

### Separately

```bash
npm run dev      # frontend (Vite)
npm run server   # storage server (tsx watch)
```

---

## Scripts

**Root (`package.json`)**

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run server` | Start the storage server (`cd server && npm run dev`) |
| `npm run dev:all` | Run frontend + server concurrently |
| `npm run build` | `tsc` type-check + `vite build` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

**Server (`server/package.json`)**

| Command | Description |
| --- | --- |
| `npm run dev` | `tsx watch index.ts` (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |

---

## Project Structure

```
FitPal/
├── src/
│   ├── components/
│   │   ├── AuthPage.tsx        # Login / registration
│   │   ├── Dashboard.tsx       # Overview, charts, AI suggestions
│   │   ├── FoodLogger.tsx      # Agentic chat + search + manual logging
│   │   ├── WeightTracker.tsx   # Weight, BMI, streaks
│   │   ├── Goals.tsx           # Goal setting + AI suggestions
│   │   ├── Recipes.tsx         # AI recipe suggestions
│   │   ├── Profile.tsx         # Edit profile
│   │   ├── Layout.tsx          # Header / nav / shell
│   │   ├── Toast.tsx           # Toast notifications
│   │   └── Spinner.tsx         # Loading indicators
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state & actions
│   ├── services/
│   │   └── openai.ts           # Client for the backend /api/ai routes
│   ├── utils/
│   │   ├── db.ts               # REST client for the storage server
│   │   ├── helpers.ts          # Dates, formatting, calculations
│   │   └── exportImport.ts     # Data export / import
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   ├── App.tsx                 # Root + state-based routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind + global styles
├── server/
│   ├── index.ts                # Express REST API + static hosting
│   ├── ai.ts                   # AI integration via the Vercel AI SDK (server-side)
│   ├── storage.ts              # SQLite storage layer
│   ├── data/                   # SQLite database (fitpal.db)
│   ├── package.json
│   └── tsconfig.json
├── public/                     # PWA icons & static assets
├── index.html
├── vite.config.ts              # Vite + PWA config
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite 8 (dev server + build)
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Recharts (charts), Motion / Framer Motion (animations), Lucide (icons), react-markdown
- vite-plugin-pwa + workbox-window (installable, offline)

**Storage server**
- Express 5 + TypeScript
- CORS
- tsx (dev execution)

**AI**
- Any OpenAI-compatible Chat Completions API via the **Vercel AI SDK** (`ai` + `@ai-sdk/openai-compatible`, plus `@ai-sdk/azure` for Azure)
- `zod` schemas with `generateText` + `Output.object` for structured outputs

---

## AI Integration

The AI client used by the frontend lives in `src/services/openai.ts`, but it only forwards requests to the backend `/api/ai/*` routes. **All real AI logic runs server-side in `server/ai.ts`** so the API key never reaches the browser.

- **Model** — `getModel()` lazily builds a Vercel AI SDK `LanguageModel` from generic env vars (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`). `AI_PROVIDER` selects the SDK: `openai-compatible` (default) or `azure` (which also needs `AI_API_VERSION`). Missing config throws a clear error — nothing is inferred.
- **Helpers**
  - `completeText(messages, temperature?)` — free-form text via `generateText`.
  - `completeStructured(messages, schema, schemaName, temperature?)` — structured JSON via `generateText` with `Output.object`, validated against a `zod` schema.
- **Structured outputs** use `zod` schemas. Mark optional fields with `.nullable()` for the widest model compatibility.
- **Key functions** include food analysis (with a `confidence` field), per-unit nutrient re-estimation, agentic meal chat (log/update/delete actions), recipe suggestions, dietary insights, and goal/nutrient suggestions. Each is exposed as an HTTP route by the `aiRouter` in `server/ai.ts`.

To add a new AI capability, define a `zod` schema, build your messages, call `completeStructured`, and wire it into `aiRouter` — follow the existing functions as templates.

---

## Storage API Reference

Base URL: `http://localhost:3001/api`. No auth; the user is identified by `userId` in the path/body.

### Users
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/users` | Create or save a user |
| `GET` | `/users/:id` | Get user by id |
| `GET` | `/users/email/:email` | Get user by email |
| `PUT` | `/users/:id` | Update a user |

### Meals
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/meals` | Create a meal |
| `GET` | `/meals/:userId` | List a user's meals |
| `PUT` | `/meals/:id` | Update a meal (body includes `userId`) |
| `DELETE` | `/meals/:userId/:id` | Delete a meal |

### Weights
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/weights` | Create a weight entry |
| `GET` | `/weights/:userId` | List a user's weight entries |
| `PUT` | `/weights/:id` | Update a weight entry (body includes `userId`) |
| `DELETE` | `/weights/:userId/:id` | Delete a weight entry |

### Notifications
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/notifications` | Save notification settings |
| `GET` | `/notifications/:userId` | Get notification settings |

### Streaks
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/streaks` | Save streak data |
| `GET` | `/streaks/:userId` | Get streak data |

### Health
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Server health check |

Errors return `404` (not found) or `500` (operation failed) with an `{ "error": "..." }` body.

---

## Data Models

These mirror `src/types/index.ts`. Records are stored in a SQLite database at `server/data/fitpal.db` (tables: `users`, `meals`, `weights`, `notifications`, `streaks`), each row holding the object as a JSON blob.

```ts
interface User {
  id: string;
  name: string;
  email: string;
  password: string;        // hashed locally
  createdAt: Date;
  profile: UserProfile;
}

interface UserProfile {
  dateOfBirth: string;     // ISO YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  height: number;          // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  dietPreference?: 'vegetarian' | 'eggetarian' | 'non-vegetarian';
  goals: UserGoals;
}

interface UserGoals {
  targetWeight: number;          // kg
  weightLossRate?: number;       // kg/week
  targetCalories: number;
  targetProtein: number;         // g
  targetCarbs: number;           // g
  targetFats: number;            // g
  targetFiber: number;           // g
  // Optional micronutrient targets (mcg/mg): vitaminA/C/D/E/B12,
  // calcium, iron, magnesium, potassium, zinc, plus customNutrients{}
}
```

```ts
interface Food {
  id: string;
  name: string;
  servingSize: string;
  nutrients: NutrientInfo;
  isIndian: boolean;
  category?: string;
  confidence?: 'high' | 'medium' | 'low';   // AI confidence in the estimate
}

interface NutrientInfo {
  calories: number;
  protein: number; carbs: number; fats: number;   // g
  fiber?: number; sugar?: number; sodium?: number;
  // Optional micros: vitaminA/C/D/E/B12, calcium, iron, magnesium, potassium, zinc
}
```

```ts
interface MealEntry {
  id: string;
  userId: string;
  date: Date;
  mealType: 'breakfast' | 'morning-snack' | 'lunch' | 'evening-snack' | 'dinner';
  foods: FoodEntry[];
  totalNutrients: NutrientInfo;
  notes?: string;
}

interface FoodEntry {
  food: Food;
  quantity: number;        // multiplier of serving size
  unit: 'serving' | 'katori' | 'bowl' | 'plate' | 'cup' | 'glass'
      | 'tbsp' | 'tsp' | 'piece' | 'slice' | 'gram' | 'ml' | 'oz';
  unitQuantity: number;    // e.g. 1.5 cups
}
```

```ts
interface WeightEntry {
  id: string;
  userId: string;
  date: Date;
  weight: number;          // kg
  bodyFat?: number;        // %
  bmi: number;
  notes?: string;
}

interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastLogDate: Date;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutrients: NutrientInfo;
  prepTime: string;
  servings: number;
}
```

---

## Extending FitPal

### Add a screen / component

1. Create `src/components/MyFeature.tsx`.
2. Add a `currentPage` case in `App.tsx`'s `renderPage()` switch.
3. Add a nav entry in `Layout.tsx`'s `menuItems` (or wire a button to `onNavigate`).

### Add a storage endpoint

1. Add a route in `server/index.ts` backed by the storage layer in `server/storage.ts` (SQLite).
2. Add a matching call in `src/utils/db.ts` (use the `apiCall` helper).
3. Add/extend types in `src/types/index.ts`.

### Add an AI feature

1. Define a `zod` schema for the output (use `.nullable()` for optional fields).
2. Build the messages and call `completeStructured(...)` in `server/ai.ts`, then expose it via `aiRouter`.
3. Add a client call in `src/services/openai.ts` and consume it from a component.

---

## Building for Production

```bash
# Frontend → dist/ (includes PWA service worker + manifest)
npm run build

# Storage server → server/dist/
cd server && npm run build && cd ..
```

Run the built output:

```bash
# Serve the static frontend
npx serve -s dist -l 5173

# Run the storage server
cd server && npm start
```

Set production env values (the server-side `AI_*` variables and a production `VITE_API_URL`) before building. `VITE_` vars are inlined at build time, while `AI_*` are read by the server at runtime.

> The PWA service worker only runs in a production build served over HTTPS or localhost.

---

## Troubleshooting

**Port already in use**
```bash
lsof -ti:5173 | xargs kill -9   # or :3001 for the server
PORT=5174 npm run dev
```

**Reinstall from scratch**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**AI not working**
- Confirm the server-side `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` are all set (the server throws on missing config).
- Verify `AI_BASE_URL` points at a reachable OpenAI-compatible endpoint and `AI_MODEL` is a valid model id for that provider.
- For Azure, ensure `AI_PROVIDER=azure`, `AI_API_VERSION` is set, `AI_BASE_URL` is the resource endpoint, and `AI_MODEL` is the deployment name.

**CORS / network errors**
- Ensure the storage server is running and `VITE_API_URL` points to it.

**Data not persisting**
- Confirm `server/data/` exists and is writable (the SQLite DB lives there).
- Check the server logs and that `userId` is consistent.

---

## Best Practices

- Keep components small; lift shared state into context where needed.
- Validate AI responses with `zod` and handle errors gracefully.
- Never commit `.env`.
- Use ISO date strings/`Date` consistently and always scope data by `userId`.

---

**Happy building!** 🚀
