import type { NextRequest } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8080'

// Hop-by-hop headers must not be forwarded (RFC 7230 §6.1) plus host/content-length
// which must be recomputed by the runtime that emits the request.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function copyHeaders(source: Headers): Headers {
  const out = new Headers()
  source.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value)
  })
  return out
}

/**
 * Forward an incoming Next.js request to the Go backend.
 * Reads BACKEND_URL at call-time so the same image can target any environment.
 *
 * @param request   Incoming request from a route handler.
 * @param segments  Captured `[...path]` slug.
 * @param prefix    Backend path prefix — e.g. `/api/v1` or `/api/auth`.
 */
export async function proxyToBackend(
  request: NextRequest,
  segments: string[],
  prefix: string,
): Promise<Response> {
  const path = segments.join('/')
  const url = new URL(request.url)
  const target = `${BACKEND_URL}${prefix}/${path}${url.search}`

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: copyHeaders(request.headers),
    redirect: 'manual',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
    init.duplex = 'half'
  }

  const upstream = await fetch(target, init)

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyHeaders(upstream.headers),
  })
}
