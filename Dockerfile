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

# NEXT_PUBLIC_API_URL is the only build-time variable. Anything with the
# NEXT_PUBLIC_ prefix is inlined into the JS bundle, so it must be known at
# build time. We hardcode the relative path '/api/proxy' — the browser hits
# the Next.js server, which then forwards via Route Handlers (see
# src/app/api/proxy/[...path]/route.ts) to BACKEND_URL at runtime.
ENV NEXT_PUBLIC_API_URL=/api/proxy
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# BACKEND_URL is read by the catch-all Route Handlers at request time, so a
# single image works across dev/staging/prod — just override this at deploy.
ENV BACKEND_URL=http://vwms-be-app-1:8080

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
