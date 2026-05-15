import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api/proxy'

// Forward to /api/v1 — keeps client.ts paths unchanged (e.g. /work-orders).
const PREFIX = '/api/v1'

// Disable caching: every request is forwarded live to the backend.
export const dynamic = 'force-dynamic'
// Node.js runtime — Edge cannot stream a request body to fetch().
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxyToBackend(request, path, PREFIX)
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE }
