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

# WHY build ARGs instead of runtime ENV:
#
# 1. BACKEND_URL — used by next.config.ts rewrites()
#    next.config.ts is evaluated once during `next build` and the result is
#    frozen into .next/routes-manifest.json. `next start` reads that static
#    manifest and never re-evaluates next.config.ts, so any runtime env var
#    arrives too late and is silently ignored.
#
# 2. NEXT_PUBLIC_API_URL — used by src/lib/api/client.ts (browser-side)
#    Any variable with the NEXT_PUBLIC_ prefix is inlined into the JS bundle
#    at build time so the browser can access it. Runtime env vars have no
#    effect because the bundle is already compiled.
#
# Both variables default to localhost:8080 when absent. On the CI runner the
# .env file does not exist (gitignored), so without build ARGs:
#   - BACKEND_URL   → rewrites proxy to localhost:8080 → ECONNREFUSED → 500
#   - NEXT_PUBLIC_API_URL → browser calls localhost:8080 directly → CORS block
#
# TODO: Replace next.config.ts rewrites() with catch-all Route Handlers
#       (src/app/api/proxy/[...path]/route.ts + src/app/api/auth/[...path]/route.ts).
#       Route Handlers run per-request on the Node.js server so they read
#       process.env.BACKEND_URL at runtime. NEXT_PUBLIC_API_URL can then be
#       set to the relative path '/api/proxy' — environment-agnostic, no
#       build ARG needed, one image works across all environments.
ARG BACKEND_URL=http://vwms-be-app-1:8080
ENV BACKEND_URL=$BACKEND_URL
ARG NEXT_PUBLIC_API_URL=/api/proxy
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (only traced dependencies, ~50-100MB vs 500MB+ node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
