# Multi-stage build: only the final stage's ~150-200MB ships to the registry,
# not the ~1GB a single-stage `npm run build` + `npm start` image would need.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# .next/standalone contains server.js and only the node_modules it actually
# needs (see next.config.ts output: "standalone"). Static assets and public/
# are not part of that trace and must be copied in separately.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Next.js standalone's server.js binds with:
#     const hostname = process.env.HOSTNAME || '0.0.0.0'
# Container platforms (App Runner, ECS Fargate) inject HOSTNAME at runtime set
# to the container's internal hostname, which overrides that '0.0.0.0' default
# and makes the server bind to one interface only. The health probe then can't
# reach it and the deploy fails with a health-check timeout, even though the
# app logs "Ready" and looks fine.
#
# Assigning HOSTNAME inline in the CMD sets it in the process's own environment
# at exec time, so it wins regardless of what the platform injected. `exec`
# keeps node as PID 1 so it still receives SIGTERM for graceful shutdown.
ENV PORT=3000
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
