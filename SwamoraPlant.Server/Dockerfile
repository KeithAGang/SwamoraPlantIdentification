# Use the Debian-slim image instead of Alpine because onnxruntime-node's
# prebuilt native binary is linked against glibc, not musl.
FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/

RUN npx tsc

# ── Production image ──────────────────────────────────────────────────────────
FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json* ./
# Install all deps (including drizzle-kit) so the entrypoint can run db:push
RUN npm ci

COPY --from=builder /app/dist ./dist

# Static runtime assets that TypeScript doesn't compile:
#   - treatments.json is read by recommendation.service.js at ../data/...
#   - models/ holds ONNX weights + labels referenced by plant-types.js at ../../models/...
COPY src/data ./dist/data
COPY models ./models

# drizzle-kit needs the config and the raw schema file to introspect and push
COPY drizzle.config.ts ./
COPY src/db/schema.ts ./src/db/schema.ts

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production

# Entrypoint: push schema → seed default account → start server
ENTRYPOINT ["/bin/sh", "entrypoint.sh"]
