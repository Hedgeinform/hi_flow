# Container form — Dockerfile (generic Node/TS service)
# Source of truth: zhenka-bot/Dockerfile (Hedgeinform/zhenka), generalized.
# Multi-stage build (base → deps → runner) preserved from the source as the
# proven default. Runtime generalized to Node; swap the base image + install/run
# commands for the project's actual package manager (npm / pnpm / yarn / bun).
#
# Render tokens consumed: none required for the default Node form.
# Project-identity lives in compose / deploy workflows, not here — keep this file
# runtime-shaped, not project-shaped. Internal port stays 3000 (compose maps the
# external <PORT_STAGING|PROD> onto it); <HEALTH_PATH> defaults to /health.

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "run", "start"]
