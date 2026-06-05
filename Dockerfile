# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the frontend (Vite) and the server (tsc), and compile native
# deps (better-sqlite3). Debian slim gives reliable prebuilt binaries / a working
# node-gyp toolchain across amd64 and arm64.
# ---------------------------------------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app

# Build tools for any native module that has no prebuilt binary for the arch.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install frontend dependencies first (better layer caching).
COPY package.json ./
RUN npm install

# Build the frontend. No secrets are needed at build time — the browser talks to
# the same-origin /api, and the Azure OpenAI key lives only on the server.
COPY . .
RUN npm run build

# Build the server and install its production dependencies (compiles
# better-sqlite3). Pruning dev deps afterwards keeps the compiled binary.
WORKDIR /app/server
RUN npm install
RUN npm run build
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 2 — minimal runtime image (single process serves API + frontend)
# ---------------------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/dist

# Copy the compiled server, its production node_modules (with the prebuilt
# native binary) and the built frontend.
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/dist ./dist

# Persistent storage (SQLite DB) lives here — mount a volume to keep user data.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001

# Node 24 ships a global fetch, so no extra packages are needed for the check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
