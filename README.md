# FitPal 🥗

**AI-powered nutrition tracker built for Indian cuisine — private by design.**

FitPal is a Progressive Web App (PWA) that helps you log Indian meals in plain language, track weight and goals, and get AI-driven nutrition insights. It runs as a React single-page app with a lightweight local Express server for storage, so your data stays on your own machine.

![FitPal dashboard](docs/images/dashboard.png)

> More screens (Login, Log Food, Weight, Goals, Recipes, Profile) are in the [docs/images/](docs/images/) folder.

---

## ✨ Highlights

- 🤖 **Agentic meal logging** — describe meals in natural language ("2 rotis and a katori of dal for lunch at 1pm"), and the AI logs, updates, or deletes entries for you.
- 🍛 **AI food analysis** — accurate macro + micronutrient estimates for Indian dishes, with a confidence indicator and editable calories when an estimate looks off.
- 📊 **Smart dashboard** — animated stat cards, macro pie chart, and weekly trend lines powered by Recharts.
- ⚖️ **Weight tracking** — BMI, body-fat, goal progress, and a streak system to reward consistency.
- 🎯 **Goal setting** — auto-calculated calorie/macro targets from your profile (Mifflin–St Jeor), fully customizable.
- 👨‍🍳 **Recipe suggestions** — healthy Indian recipes tailored to your diet preference and goals.
- 💡 **Nutrient suggestions** — one-click AI food ideas to close the gap on any remaining nutrient.
- 📱 **Installable PWA** — works offline, responsive across phone/tablet/desktop.
- 🔒 **Privacy first** — local SQLite storage, no third-party cloud beyond your own Azure OpenAI resource.

See **[FEATURES.md](docs/FEATURES.md)** for the full feature breakdown.

---

## 🚧 In Progress

Some features are actively being worked on — see **[TODO.md](docs/TODO.md)** for details.

---

## 🚀 Quick Start

### Prerequisites
- An **Azure OpenAI** resource with a GPT-4o (or compatible) deployment — required for AI features.
- **Docker** (for the recommended self-host path) **or Node.js 24+** (to run from source).

The AI key is read **server-side only** — it is never shipped to the browser.

---

## 🐳 Self-Hosting with Docker (recommended)

The whole app (frontend + API) runs as a single container. Your data is stored
as JSON on a mounted volume, so it survives upgrades.

```bash
# 1. Grab the compose file and the env template
curl -O https://raw.githubusercontent.com/sanskagarwal/FitPal/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/sanskagarwal/FitPal/main/.env.example

# 2. Edit .env with your Azure OpenAI details:
#      AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
#      AZURE_OPENAI_KEY=your_api_key_here
#      AZURE_OPENAI_DEPLOYMENT=gpt-4o

# 3. Start it
docker compose up -d
```

Open <http://localhost:3001>. Update later with `docker compose pull && docker compose up -d`.

> The image is published as `ghcr.io/sanskagarwal/fitpal`. To build locally
> instead, comment out `image:` in
> `docker-compose.yml`, uncomment `build: .`, and run `docker compose up -d --build`.

### Run the container directly (without compose)

```bash
docker run -d --name fitpal -p 3001:3001 \
  -e AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com \
  -e AZURE_OPENAI_KEY=your_api_key_here \
  -e AZURE_OPENAI_DEPLOYMENT=gpt-4o \
  -v fitpal-data:/app/data \
  ghcr.io/sanskagarwal/fitpal:latest
```

---

## 🧑‍💻 Run from source (development)

### 1. Install

```bash
git clone <repository-url>
cd FitPal
npm install
cd server && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your Azure OpenAI details:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_KEY=your_api_key_here
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

### 3. Run

```bash
npm run dev:all
```

- Frontend → http://localhost:5173 (proxies `/api` to the server)
- Storage + AI server → http://localhost:3001

Or run them in separate terminals:

```bash
npm run dev      # frontend
npm run server   # storage + AI server
```

### Production build from source

```bash
npm run build                 # build the frontend
cd server && npm run build    # build the server
node dist/index.js            # serves API + the built frontend on one port
```

---

## 🧭 Usage

1. **Register** with your basics (DOB, height, activity level) — FitPal estimates your starting goals.
2. **Set goals** — tweak target weight, calories, and macros, or let AI suggest them.
3. **Log meals** — use the natural-language quick-log, or search foods and add them manually.
4. **Track weight** — log regularly to build a streak and watch goal progress.
5. **Review the dashboard** — daily totals, macro split, and weekly trends.
6. **Discover recipes** and **nutrient suggestions** to hit your targets.

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite 8 (build/dev)
- Tailwind CSS v4
- Recharts (charts) · Motion / Framer Motion (animations) · Lucide (icons) · react-markdown
- vite-plugin-pwa (offline + installable)

**Server**
- Express 5 + TypeScript (tsx for dev)
- SQLite storage (`better-sqlite3`) at `server/data/fitpal.db`
- Serves the built frontend and proxies all AI calls (single process in production)

**AI**
- Azure OpenAI (GPT-4o) via the `openai` SDK with structured outputs (`zod`), called **server-side** so the key stays private

---

## 📁 Project Structure

```
FitPal/
├── src/                  # Frontend SPA
│   ├── components/       # UI (Dashboard, FoodLogger, WeightTracker, …)
│   ├── context/          # AuthContext
│   ├── services/         # openai.ts (calls the backend /api/ai routes)
│   ├── utils/            # db.ts (API client), helpers, export/import
│   └── types/            # Shared TypeScript types
├── server/               # Express storage + AI server
│   ├── index.ts          # REST API + static frontend hosting
│   ├── ai.ts             # Azure OpenAI integration (server-side)
│   └── data/             # SQLite database (fitpal.db)
├── public/               # PWA icons & static assets
├── Dockerfile            # Multi-stage build (single-process image)
├── docker-compose.yml    # Self-host deployment
├── vite.config.ts        # Vite + PWA config
└── package.json
```

---

## 📦 Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run server` | Start the local storage server |
| `npm run dev:all` | Run frontend + server together |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 🔗 More Docs

- **[FEATURES.md](docs/FEATURES.md)** — complete feature list
- **[DEVELOPER.md](docs/DEVELOPER.md)** — architecture, API reference, data models, and contribution guide

## 📄 License

See [LICENSE](LICENSE).

---

**FitPal** — track Indian meals smartly & privately 🥗💪
