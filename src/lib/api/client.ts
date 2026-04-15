import type { ApiError } from '@/types/api'
import { normalizeAuthToken } from '@/lib/auth/token'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | boolean | undefined>
  body?: unknown
}

async function request<T>(
  path: string,
  { params, body, ...init }: RequestOptions = {},
): Promise<T> {
  // BASE_URL may be a relative path (e.g. "/api/proxy") when using the
  // Next.js rewrite proxy. new URL() requires an absolute base in that case.
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const url = new URL(`${BASE_URL}${path}`, base)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const token =
    typeof window !== 'undefined'
      ? normalizeAuthToken(localStorage.getItem('auth_token'))
      : null

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    // Backend httpkit.Error() sends { "error": "..." } — no "code" field.
    // ApiError shape expects { code, message }, so we normalize both formats.
    const body = await response.json().catch(() => null)
    const code: string = body?.code ?? 'UNKNOWN'
    const message: string = body?.message ?? body?.error ?? `HTTP ${response.status}`
    throw new ApiClientError(response.status, code, message, body?.details)
  }

  // 204 No Content
  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'POST', body, ...opts }),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PUT', body, ...opts }),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { method: 'PATCH', body, ...opts }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
}

export { ApiClientError }
