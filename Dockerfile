# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:24-slim AS ui-builder
WORKDIR /ui
COPY SwamoraPlant.ui/package.json SwamoraPlant.ui/package-lock.json* ./
RUN npm ci
COPY SwamoraPlant.ui/ ./
# These are baked into the Vite bundle at build time.
# Render passes all envVars as Docker build args automatically.
# Locally, pass them via docker-compose build args (see docker-compose.yml).
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_MAPS_MAP_ID
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID
RUN npm run build

# ── Stage 2: Compile TypeScript server ───────────────────────────────────────
FROM node:24-slim AS server-builder
WORKDIR /app
COPY SwamoraPlant.Server/package.json SwamoraPlant.Server/package-lock.json* ./
RUN npm ci
COPY SwamoraPlant.Server/tsconfig.json SwamoraPlant.Server/drizzle.config.ts ./
COPY SwamoraPlant.Server/src/ ./src/
RUN npx tsc

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:24-slim
WORKDIR /app

COPY SwamoraPlant.Server/package.json SwamoraPlant.Server/package-lock.json* ./
RUN npm ci

COPY --from=server-builder /app/dist ./dist
COPY --from=ui-builder /ui/dist ./public

# Static runtime assets (data + ONNX models)
COPY SwamoraPlant.Server/src/data ./dist/data
COPY SwamoraPlant.Server/models ./models

# drizzle-kit needs the config + raw schema to push migrations
COPY SwamoraPlant.Server/drizzle.config.ts ./
COPY SwamoraPlant.Server/src/db/schema.ts ./src/db/schema.ts

COPY SwamoraPlant.Server/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Default port; Render overrides this via the PORT env var (set to 10000).
EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
