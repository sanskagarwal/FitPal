# FitPal Developer Documentation

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
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Extending FitPal](#extending-fitpal)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

FitPal has three parts:

1. **Frontend SPA** (`src/`): React 19 + TypeScript + Vite. All UI, state, and
   navigation live here. Navigation is **state-based** (a `currentPage` string
   with a `switch` in `App.tsx`), not React Router.
2. **AI service** (`src/services/openai.ts`): a thin client that calls the
   backend `/api/ai/*` routes. The actual AI calls run **server-side**
   (`server/services/aiService.ts`) via the **Vercel AI SDK**, which talks to
   any OpenAI-compatible Chat Completions API (OpenAI, LiteLLM, OpenRouter,
   Ollama, vLLM, Azure OpenAI) or the native Anthropic and Google APIs, with
   **structured outputs** validated by `zod`, so the API key never reaches the
   browser.
3. **Storage server** (`server/`): a layered **Express 5** app that persists
   data in a **SQLite** database (`better-sqlite3`) at `server/data/fitpal.db`,
   serves the built frontend, and proxies AI calls. The frontend talks to it via
   a REST client in `src/utils/db.ts`.

The server is organized in layers: routes define endpoints and middleware,
controllers parse requests and shape responses, services hold the business
logic, and repositories own all SQLite access.

```
Browser (React SPA) --HTTP--> Express server --> server/data/fitpal.db (SQLite)
        |                          |
        |                          '--HTTPS--> AI provider (OpenAI-compatible API, structured outputs)
        '--(served by the same Express process)
```

Authentication uses a signed JWT stored in an httpOnly cookie. Data routes
require a valid session and enforce per-user ownership.

---

## Prerequisites

- **Node.js 24+** ([download](https://nodejs.org/))
- **npm** (bundled with Node)
- **Git**
- An **AI provider** with an OpenAI-compatible Chat Completions API (OpenAI,
  LiteLLM, OpenRouter, Ollama, vLLM, Azure OpenAI), or a native Anthropic or
  Google API key. Required for AI features.

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
# Auth (server-side only). Required, at least 16 characters.
JWT_SECRET=a-long-random-secret

# AI provider (server-side only, never shipped to the browser).
# Works with any OpenAI-compatible Chat Completions API.
AI_API_KEY=your-key-here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
# To use Azure OpenAI instead, set AI_PROVIDER=azure with AI_BASE_URL as the
# resource endpoint, AI_MODEL as the deployment name, and AI_API_VERSION set.
# AI_PROVIDER=azure
# AI_API_VERSION=2024-08-01-preview
# To target Anthropic or Google natively, set AI_PROVIDER=anthropic or
# AI_PROVIDER=google with AI_API_KEY and AI_MODEL. AI_BASE_URL is optional.
# AI_PROVIDER=anthropic
# AI_MODEL=claude-3-5-sonnet-latest

# Optional: port the storage/API server listens on (default 3001).
# PORT=3001

# Optional: base URL the frontend uses to reach the API. Defaults to the
# relative "/api" path. Only set this for split deployments where the frontend
# and server live on different origins.
# VITE_API_URL=http://localhost:3001/api
```

> Only `VITE_`-prefixed variables are exposed to the frontend. The `AI_*` and
> `JWT_SECRET` variables are read by the server only, so secrets never reach the
> browser.

| Variable | Required | Scope | Default | Description |
| --- | --- | --- | --- | --- |
| `JWT_SECRET` | Yes | Server | None | Secret used to sign the auth session cookie (at least 16 characters). |
| `AI_API_KEY` | Yes | Server | None | API key for the AI provider (any non-empty value for local Ollama). |
| `AI_BASE_URL` | If OpenAI-compatible/Azure | Server | None | Base URL of the OpenAI-compatible endpoint, or the Azure resource endpoint when `AI_PROVIDER=azure`. Optional for `anthropic` and `google` (defaults to the official endpoint). |
| `AI_MODEL` | Yes | Server | None | Model id, or the deployment name when `AI_PROVIDER=azure`. |
| `AI_PROVIDER` | No | Server | `openai-compatible` | AI SDK to use: `openai-compatible`, `azure`, `anthropic`, or `google`. |
| `AI_API_VERSION` | If Azure | Server | None | Azure OpenAI API version (required when `AI_PROVIDER=azure`). |
| `PORT` | No | Server | `3001` | Port the storage/API server listens on. |
| `DATA_DIR` | No | Server | `server/data` | Directory holding the SQLite database. |
| `STATIC_DIR` | No | Server | `../../dist` | Directory of the built frontend to serve. |
| `VITE_API_URL` | No | Frontend (build-time) | `/api` | Base URL the frontend calls. Inlined at build time. Only needed for split deployments where the frontend and server are on different origins. |

### Storage server port

The server defaults to port `3001`. Override with the `PORT` env var.

---

## Running the App

### Both together (recommended)

```bash
npm run dev:all
```

- Frontend: http://localhost:5173
- Storage server: http://localhost:3001

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
| `npm run lint` | Run ESLint (`--max-warnings 0`) |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run the Playwright end-to-end tests |

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
│   ├── components/             # Feature components (with co-located subfolders)
│   │   ├── AuthPage.tsx        # Login / registration
│   │   ├── Dashboard.tsx       # Overview, charts, AI suggestions
│   │   ├── FoodLogger.tsx      # Agentic chat + search + manual logging
│   │   ├── WeightTracker.tsx   # Weight, BMI, streaks
│   │   ├── Goals.tsx           # Goal setting + AI suggestions
│   │   ├── Recipes.tsx         # AI recipe suggestions
│   │   ├── Profile.tsx         # Edit profile
│   │   ├── Layout.tsx          # Header / nav / shell
│   │   └── ...                 # Toast, Spinner, DateNavigator, CalendarPopover
│   ├── context/
│   │   ├── AuthContext.tsx     # Auth state & actions
│   │   ├── DateContext.tsx     # Selected day for logging/review
│   │   └── PreferencesContext.tsx
│   ├── services/
│   │   ├── openai.ts           # Client for the backend /api/ai routes
│   │   └── ndjsonStream.ts     # Streaming helper for chat responses
│   ├── utils/
│   │   ├── db.ts               # REST client for the storage server
│   │   ├── helpers.ts          # Dates, formatting, calculations
│   │   ├── goals.ts            # Goal/target math
│   │   ├── weight.ts           # BMI and weight helpers
│   │   └── exportImport.ts     # Data export / import
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   ├── App.tsx                 # Root + state-based routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind + global styles
├── server/
│   ├── index.ts                # Process bootstrap (open storage, bind port)
│   ├── app.ts                  # Express app assembly (createApp)
│   ├── env.ts                  # Env loading + zod validation
│   ├── auth.ts                 # JWT signing/verification, password hashing
│   ├── domain.ts               # Server-side domain types + zod schemas
│   ├── validation.ts           # Request body schemas
│   ├── routes/                 # Route definitions per resource
│   ├── controllers/            # Request parsing + response shaping
│   ├── services/               # Business logic (incl. aiService.ts)
│   ├── repositories/           # SQLite access per entity
│   ├── middleware/             # auth, validate, errorHandler, requestLogger
│   ├── db/                     # SQLite connection, migrations, base repo
│   ├── prompts/                # AI prompt templates
│   ├── data/                   # SQLite database (fitpal.db)
│   ├── package.json
│   └── tsconfig.json
├── tests/                      # Vitest (backend, frontend) + Playwright (e2e)
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
- Recharts (charts), Motion (animations), Lucide (icons)
- vite-plugin-pwa + workbox-window (installable, offline)

**Storage server**

- Express 5 + TypeScript
- `better-sqlite3` (SQLite)
- `jsonwebtoken` + `bcryptjs` (auth), `cookie-parser`, `cors`
- tsx (dev execution)

**AI**

- Any OpenAI-compatible Chat Completions API via the **Vercel AI SDK** (`ai`,
  `@ai-sdk/openai-compatible`, `@ai-sdk/azure` for Azure, `@ai-sdk/anthropic`
  for Anthropic, and `@ai-sdk/google` for Google)
- `zod` schemas with `generateText` + `Output.object` for structured outputs

**Testing**

- Vitest + Testing Library (frontend and backend), supertest (HTTP)
- Playwright (end-to-end)

---

## AI Integration

The AI client used by the frontend lives in `src/services/openai.ts`, but it
only forwards requests to the backend `/api/ai/*` routes. **All real AI logic
runs server-side in `server/services/aiService.ts`** so the API key never
reaches the browser. The routes are defined in `server/routes/aiRoutes.ts`,
wired to `server/controllers/aiController.ts`, and prompt templates live in
`server/prompts/`.

- **Model.** `getModel()` lazily builds a Vercel AI SDK `LanguageModel` from
  generic env vars (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`). `AI_PROVIDER`
  selects the SDK: `openai-compatible` (default) or `azure` (which also needs
  `AI_API_VERSION`). Missing config throws a clear error; nothing is inferred.
- **Structured outputs** use `zod` schemas via `generateText` with
  `Output.object`. Mark optional fields with `.nullable()` for the widest model
  compatibility.
- **Key functions** include food analysis (with a `confidence` field),
  per-unit nutrient re-estimation, agentic meal chat (log, update, and delete
  actions, including a streaming variant), recipe suggestions, dietary insights,
  and goal and nutrient suggestions. Each is exposed as an HTTP route by
  `aiRoutes`.

To add a new AI capability, add a prompt in `server/prompts/`, implement the
logic in `aiService.ts` with a `zod` schema, expose it through `aiController.ts`
and `aiRoutes.ts`, and add a client call in `src/services/openai.ts`. Follow the
existing functions as templates.

---

## API Reference

Base URL: `http://localhost:3001/api`. All data routes require authentication
via the session cookie and enforce per-user ownership; a user can only read or
write their own records. AI routes additionally pass through a per-user rate
limiter.

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a new user and start a session |
| `POST` | `/auth/login` | Public | Log in and start a session |
| `POST` | `/auth/logout` | Public | Clear the session cookie |
| `GET` | `/auth/me` | Required | Return the current user |

### Users

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/users` | Create or upsert the current user |
| `GET` | `/users/:id` | Get the current user by id |
| `PUT` | `/users/:id` | Update the current user (profile/goals merged server-side) |

### Meals

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/meals` | Create a meal |
| `GET` | `/meals/:userId` | List the user's meals |
| `PUT` | `/meals/:id` | Update a meal (body includes `userId`) |
| `DELETE` | `/meals/:userId/:id` | Delete a meal |

### Weights

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/weights` | Create a weight entry |
| `GET` | `/weights/:userId` | List the user's weight entries |
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

### AI

All `/ai/*` routes are `POST` and require auth:
`analyze-food`, `reestimate-unit`, `recipes`, `insights`, `suggest-meal`,
`suggest-nutrient`, `suggest-goals`, `chat-meal`, and `chat-meal-stream`.

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Server health check |

Errors return a JSON body of the form `{ "error": "..." }` with an appropriate
status code (for example `401` unauthorized, `403` forbidden, `404` not found,
`500` server error).

---

## Data Models

These mirror `src/types/index.ts`. Records are stored in a SQLite database at
`server/data/fitpal.db`. Each table (`users`, `meals`, `weights`,
`notifications`, `streaks`, plus a `nutrition_cache`) holds the object as a JSON
blob in a `data` column, with id and ownership columns for indexing. The schema
is evolved through versioned migrations (see `server/db/migrations.ts`).

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

### Add a screen or component

1. Create `src/components/MyFeature.tsx`.
2. Add a `currentPage` case in the `renderPage()` switch in `App.tsx`.
3. Add a nav entry in `Layout.tsx`'s `menuItems` (or wire a button to
   `onNavigate`).

### Add a storage endpoint

1. Add the SQLite access in a repository under `server/repositories/`.
2. Add the business logic in a service under `server/services/`.
3. Add a controller in `server/controllers/` and a route in `server/routes/`,
   applying `requireAuth` and the ownership guards.
4. Add a matching call in `src/utils/db.ts` (use the `apiCall` helper) and
   extend types in `src/types/index.ts`.

### Add an AI feature

1. Add a prompt template in `server/prompts/`.
2. Define a `zod` schema and implement the logic in
   `server/services/aiService.ts` (use `.nullable()` for optional fields).
3. Expose it through `server/controllers/aiController.ts` and
   `server/routes/aiRoutes.ts`.
4. Add a client call in `src/services/openai.ts` and consume it from a
   component.

---

## Building for Production

```bash
# Frontend -> dist/ (includes PWA service worker + manifest)
npm run build

# Storage server -> server/dist/
cd server && npm run build && cd ..
```

Run the built output:

```bash
# Serve the static frontend
npx serve -s dist -l 5173

# Run the storage server
cd server && npm start
```

Set production env values (`JWT_SECRET`, the `AI_*` variables, and a production
`VITE_API_URL`) before building. `VITE_` vars are inlined at build time, while
the server reads `JWT_SECRET` and `AI_*` at runtime.

> The PWA service worker only runs in a production build served over HTTPS or
> localhost.

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

**Server refuses to start**

- Ensure `JWT_SECRET` is set and at least 16 characters. The server validates
  the environment on boot and exits with a clear message if it is missing.

**AI not working**

- Confirm the server-side `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` are all
  set (the AI service throws on missing config).
- Verify `AI_BASE_URL` points at a reachable OpenAI-compatible endpoint and
  `AI_MODEL` is a valid model id for that provider.
- For Azure, ensure `AI_PROVIDER=azure`, `AI_API_VERSION` is set, `AI_BASE_URL`
  is the resource endpoint, and `AI_MODEL` is the deployment name.

**CORS or network errors**

- Ensure the storage server is running and `VITE_API_URL` points to it.

**Data not persisting**

- Confirm the data directory exists and is writable (the SQLite DB lives there;
  override with `DATA_DIR`).
- Check the server logs and that `userId` is consistent.

---

## Best Practices

- Keep components small and lift shared state into context where needed.
- Keep the server layering intact: routes to controllers to services to
  repositories.
- Validate inputs at the boundary with `zod` and handle errors gracefully.
- Never commit `.env`.
- Use ISO date strings or `Date` consistently and always scope data by `userId`.

---

Happy building.
