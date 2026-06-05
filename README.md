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
- 🔒 **Privacy first** — local SQLite storage, no third-party cloud beyond the AI provider you choose.

See **[FEATURES.md](docs/FEATURES.md)** for the full feature breakdown.

---

## 🤖 AI Providers

FitPal uses the [Vercel AI SDK](https://sdk.vercel.ai), so it works with **any OpenAI-compatible Chat Completions API** — just set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` (read server-side only, never shipped to the browser). Every request uses **structured outputs**: the model returns JSON matching a `zod` schema that the SDK enforces and validates, keeping AI features reliable.

**Supported**
- [x] **OpenAI**
- [x] **Azure OpenAI** — set `AI_PROVIDER=azure`
- [x] **OpenAI-compatible gateways** — [LiteLLM](https://github.com/BerriAI/litellm), [OpenRouter](https://openrouter.ai/)
- [x] **Local / self-hosted** — [Ollama](https://ollama.com/), vLLM

**Planned**
- [ ] **Native Anthropic** (`@ai-sdk/anthropic`)
- [ ] **Native Google** (`@ai-sdk/google`)

---

## 🚀 Quick Start

### Prerequisites
- An **AI provider** — see [AI Providers](#-ai-providers) above.
- **Docker** (recommended) or **Node.js 24+** (to run from source).

---

## 🐳 Self-Hosting with Docker (recommended)

The whole app (frontend + API) runs as a single container. Your data lives in a SQLite database on a mounted volume, so it survives upgrades.

```bash
# 1. Grab the compose file and the env template
curl -O https://raw.githubusercontent.com/sanskagarwal/FitPal/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/sanskagarwal/FitPal/main/.env.example

# 2. Edit .env with your AI provider details:
#      AI_API_KEY=your-key-here
#      AI_BASE_URL=https://api.openai.com/v1
#      AI_MODEL=gpt-4o-mini

# 3. Start it
docker compose up -d
```

Open <http://localhost:3001>. Update later with `docker compose pull && docker compose up -d`.

> Image: `ghcr.io/sanskagarwal/fitpal`. To build locally, swap `image:` for `build: .` in `docker-compose.yml` and run `docker compose up -d --build`.

### Run the container directly (without compose)

```bash
docker run -d --name fitpal -p 3001:3001 \
  -e AI_API_KEY=your-key-here \
  -e AI_BASE_URL=https://api.openai.com/v1 \
  -e AI_MODEL=gpt-4o-mini \
  -v fitpal-data:/app/data \
  ghcr.io/sanskagarwal/fitpal:latest
```

---

## 🧑‍💻 Run from source (development)

```bash
git clone <repository-url>
cd FitPal
npm install && (cd server && npm install)
cp .env.example .env   # then set AI_API_KEY, AI_BASE_URL, AI_MODEL
npm run dev:all        # frontend → :5173, server → :3001
```

Works with any OpenAI-compatible API; for **Azure OpenAI** set `AI_PROVIDER=azure`. See [.env.example](.env.example) for all options and **[DEVELOPER.md](docs/DEVELOPER.md)** for production builds and details.

### Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `AI_API_KEY` | Yes | — | API key for your AI provider (any non-empty value for local Ollama). |
| `AI_BASE_URL` | Yes | — | OpenAI-compatible endpoint, or the Azure resource endpoint when `AI_PROVIDER=azure`. |
| `AI_MODEL` | Yes | — | Model id, or the Azure deployment name when `AI_PROVIDER=azure`. |
| `AI_PROVIDER` | No | `openai-compatible` | Set to `azure` to use the Azure OpenAI SDK. |
| `AI_API_VERSION` | If Azure | — | Azure OpenAI API version (required when `AI_PROVIDER=azure`). |
| `PORT` | No | `3001` | Port the storage/API server listens on. |
| `VITE_API_URL` | No | `/api` | Base URL the frontend calls (inlined at build time). Only set for split deployments where the frontend and server are on different origins. |

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

- **Frontend** — React 19 + TypeScript, Vite 8, Tailwind CSS v4, Recharts, Framer Motion, vite-plugin-pwa (offline + installable)
- **Server** — Express 5 + TypeScript, SQLite (`better-sqlite3`); serves the frontend and proxies all AI calls in one process
- **AI** — any OpenAI-compatible API via the **Vercel AI SDK** (`ai` + `@ai-sdk/openai-compatible`, `@ai-sdk/azure`), structured outputs validated by `zod`, called server-side

---

## 🔗 More Docs

- **[FEATURES.md](docs/FEATURES.md)** — complete feature list
- **[DEVELOPER.md](docs/DEVELOPER.md)** — architecture, API reference, data models, and contribution guide
- **[TODO.md](docs/TODO.md)** — roadmap

## 📄 License

See [LICENSE](LICENSE).

---

**FitPal** — track Indian meals smartly & privately 🥗💪
