# FitPal

**AI-powered nutrition tracker built for Indian cuisine, private by design.**

FitPal is a Progressive Web App (PWA) that helps you log Indian meals in plain
language, track weight and goals, and get AI-driven nutrition insights. It runs
as a React single-page app with a lightweight local Express server for storage,
so your data stays on your own machine.

![FitPal dashboard](docs/images/dashboard.png)

> More screens (Login, Log Food, Weight, Goals, Recipes, Profile) are in the
> [docs/images/](docs/images/) folder.

---

## Highlights

- **Agentic meal logging.** Describe meals in natural language ("2 rotis and a
  katori of dal for lunch at 1pm"), and the AI logs, updates, or deletes entries
  for you.
- **AI food analysis.** Accurate macro and micronutrient estimates for Indian
  dishes, with a confidence indicator and editable calories when an estimate
  looks off.
- **Smart dashboard.** Animated stat cards, a macro pie chart, and weekly trend
  lines powered by Recharts.
- **Weight tracking.** BMI, body-fat, goal progress, and a streak system to
  reward consistency.
- **Goal setting.** Auto-calculated calorie and macro targets from your profile
  (Mifflin-St Jeor), fully customizable.
- **Recipe suggestions.** Healthy Indian recipes tailored to your diet
  preference and goals.
- **Nutrient suggestions.** One-click AI food ideas to close the gap on any
  remaining nutrient.
- **Installable PWA.** Works offline and is responsive across phone, tablet, and
  desktop.
- **Privacy first.** Local SQLite storage, with no third-party cloud beyond the
  AI provider you choose.

See [FEATURES.md](docs/FEATURES.md) for the full feature breakdown.

---

## AI providers

> Note: Use a model that supports structured output (JSON/schema-constrained responses). FitPal validates AI responses against `zod` schemas, and models without reliable structured output may fail requests.

FitPal uses the [Vercel AI SDK](https://sdk.vercel.ai), so it works with **any
OpenAI-compatible Chat Completions API**. Set `AI_API_KEY`, `AI_BASE_URL`, and
`AI_MODEL` (read server-side only, never shipped to the browser).

**Supported**

- [x] **OpenAI**
- [x] **Azure OpenAI** (set `AI_PROVIDER=azure`)
- [x] **Anthropic** (set `AI_PROVIDER=anthropic`)
- [x] **Google Gemini** (set `AI_PROVIDER=google`)
- [x] **OpenAI-compatible gateways** such as
  [LiteLLM](https://github.com/BerriAI/litellm) and
  [OpenRouter](https://openrouter.ai/)
- [x] **Local or self-hosted** such as [Ollama](https://ollama.com/) and vLLM

---

## Quick start

### Prerequisites

- An **AI provider**, see [AI providers](#ai-providers) above.
- **Docker** (recommended) or **Node.js 24+** (to run from source).

---

## Self-hosting with Docker (recommended)

The whole app (frontend and API) runs as a single container. Your data lives in
a SQLite database on a mounted volume, so it survives upgrades.

```bash
# 1. Grab the compose file and the env template
curl -O https://raw.githubusercontent.com/sanskagarwal/FitPal/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/sanskagarwal/FitPal/main/.env.example

# 2. Edit .env with your settings:
#      JWT_SECRET=a-long-random-secret
#      AI_API_KEY=your-key-here
#      AI_BASE_URL=https://api.openai.com/v1
#      AI_MODEL=gpt-4o-mini

# 3. Start it
docker compose up -d
```

Open <http://localhost:3001>.

To update to the latest image later:

```bash
docker compose pull
docker compose up -d
```

> Image: `ghcr.io/sanskagarwal/fitpal`. To build locally, swap `image:` for
> `build: .` in `docker-compose.yml` and run `docker compose up -d --build`.

### Run the container directly (without compose)

```bash
docker run -d --name fitpal -p 3001:3001 \
  -e JWT_SECRET=a-long-random-secret \
  -e AI_API_KEY=your-key-here \
  -e AI_BASE_URL=https://api.openai.com/v1 \
  -e AI_MODEL=gpt-4o-mini \
  -v fitpal-data:/app/data \
  ghcr.io/sanskagarwal/fitpal:latest
```

---

## Run from source (development)

```bash
git clone <repository-url>
cd FitPal
npm install && (cd server && npm install)
cp .env.example .env   # then set JWT_SECRET, AI_API_KEY, AI_BASE_URL, AI_MODEL
npm run dev:all        # frontend on :5173, server on :3001
```

Works with any OpenAI-compatible API. For **Azure OpenAI**, set
`AI_PROVIDER=azure`. For native **Anthropic** or **Google** access, set
`AI_PROVIDER=anthropic` or `AI_PROVIDER=google`. See
[.env.example](.env.example) for all options and
[DEVELOPER.md](docs/DEVELOPER.md) for production builds and details.

### Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | Yes | None | Secret used to sign the auth session cookie (at least 16 characters). |
| `AI_API_KEY` | Yes | None | API key for your AI provider (any non-empty value for local Ollama). |
| `AI_BASE_URL` | If OpenAI-compatible/Azure | None | OpenAI-compatible endpoint, or the Azure resource endpoint when `AI_PROVIDER=azure`. Optional for `anthropic` and `google`. |
| `AI_MODEL` | Yes | None | Model id, or the Azure deployment name when `AI_PROVIDER=azure`. |
| `AI_VISION_MODEL` | No | `AI_MODEL` | Multimodal model for photo-based meal logging. Falls back to `AI_MODEL`; set only if that model is text-only or you prefer a different vision model. |
| `AI_PROVIDER` | No | `openai-compatible` | AI SDK to use: `openai-compatible`, `azure`, `anthropic`, or `google`. |
| `AI_API_VERSION` | If Azure | None | Azure OpenAI API version (required when `AI_PROVIDER=azure`). |
| `PORT` | No | `3001` | Port the storage/API server listens on. |
| `DATA_DIR` | No | `server/data` | Directory for the SQLite database. |
| `VITE_API_URL` | No | `/api` | Base URL the frontend calls (inlined at build time). Only set for split deployments where the frontend and server are on different origins. |

---

## Usage

1. **Register** with your basics (DOB, height, activity level) and FitPal
   estimates your starting goals.
2. **Set goals.** Tweak target weight, calories, and macros, or let AI suggest
   them.
3. **Log meals.** Use the natural-language quick-log, or search foods and add
   them manually.
4. **Track weight.** Log regularly to build a streak and watch goal progress.
5. **Review the dashboard** for daily totals, the macro split, and weekly
   trends.
6. **Discover recipes** and **nutrient suggestions** to hit your targets.

---

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite 8, Tailwind CSS v4, Recharts,
  Motion, vite-plugin-pwa (offline and installable).
- **Server:** Express 5 + TypeScript, SQLite (`better-sqlite3`). Serves the
  frontend and proxies all AI calls in one process.
- **AI:** any OpenAI-compatible API via the **Vercel AI SDK** (`ai`,
  `@ai-sdk/openai-compatible`, `@ai-sdk/azure`), with structured outputs
  validated by `zod`, called server-side.

---

## More docs

- [FEATURES.md](docs/FEATURES.md): complete feature list.
- [DEVELOPER.md](docs/DEVELOPER.md): architecture, API reference, data models,
  and contribution guide.
- [TODO.md](docs/TODO.md): roadmap.

## License

See [LICENSE](LICENSE).

---

FitPal: track Indian meals smartly and privately.
