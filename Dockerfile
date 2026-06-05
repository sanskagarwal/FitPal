# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the frontend (Vite) and the server (tsc)
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

# Install frontend dependencies first (better layer caching).
COPY package.json ./
RUN npm install

# Build the frontend. No secrets are needed at build time — the browser talks to
# the same-origin /api, and the Azure OpenAI key lives only on the server.
COPY . .
RUN npm run build

# Build the server.
WORKDIR /app/server
RUN npm install
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — minimal runtime image (single process serves API + frontend)
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/dist

# Install only the server's production dependencies.
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --omit=dev

# Copy the compiled server and the built frontend.
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/dist ./dist

# Persistent JSON storage lives here (mount a volume to keep user data).
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/dist/index.js"]
