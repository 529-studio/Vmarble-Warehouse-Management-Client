# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# WHY build ARG instead of runtime ENV:
# next.config.ts calls rewrites() at build time — Next.js evaluates the config
# once during `next build` and freezes the result into .next/routes-manifest.json.
# At `next start`, the server reads that static manifest and never re-evaluates
# next.config.ts, so any runtime env var (docker-compose, container env) arrives
# too late and is silently ignored.
#
# The .env file is gitignored and therefore absent on the CI runner, causing
# process.env.BACKEND_URL to be undefined and falling back to 'http://localhost:8080',
# which is the container's own loopback — not the BE service.
#
# Passing BACKEND_URL as a build ARG ensures the correct value is present
# when `npm run build` runs, so the right URL gets baked into routes-manifest.json.
#
# TODO: Replace next.config.ts rewrites() with a catch-all Route Handler
#       (src/app/api/proxy/[...path]/route.ts + src/app/api/auth/[...path]/route.ts).
#       Route Handlers run per-request on the Node.js server, so they read
#       process.env.BACKEND_URL at runtime — no build ARG needed, one image
#       works across all environments.
ARG BACKEND_URL=http://10.8.0.1:8080
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what's needed to run
COPY --from=builder /app/public       ./public
COPY --from=builder /app/.next        ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
