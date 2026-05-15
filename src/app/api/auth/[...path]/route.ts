import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api/proxy'

// Auth lives at /api/auth/* on the backend (no /api/v1 prefix).
const PREFIX = '/api/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ path: string[] }> }

async function handle(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params
  return proxyToBackend(request, path, PREFIX)
}

export { handle as GET, handle as POST }
