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

/**
 * Maps an API error to a user-friendly Vietnamese message with actionable guidance.
 * Use in every `onError` handler instead of showing raw `err.message`.
 *
 * @param err - The error caught by TanStack Query or try/catch
 * @param fallback - Optional domain-specific fallback (e.g. "Tạo đơn hàng thất bại")
 */
export function mapApiErrorVi(err: unknown, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.'): string {
  if (!(err instanceof ApiClientError)) return fallback

  const msg = (err.message ?? '').toLowerCase()

  // Duplicate key (unique constraint violation from PostgreSQL)
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('already exists')) {
    if (msg.includes('code')) return 'Mã này đã tồn tại. Vui lòng chọn mã khác.'
    return 'Dữ liệu bị trùng. Vui lòng kiểm tra và nhập giá trị khác.'
  }

  // Not found
  if (err.status === 404 || msg.includes('not found')) {
    return 'Không tìm thấy dữ liệu. Có thể đã bị xóa hoặc chưa tồn tại.'
  }

  // Area conservation (inventory cuts)
  if (err.status === 422 || msg.includes('area')) {
    return 'Diện tích vượt quá tấm nguồn. Kiểm tra lại kích thước.'
  }

  // Precondition failed (state conflict)
  if (err.status === 412 || msg.includes('no longer available') || msg.includes('precondition')) {
    return 'Dữ liệu đã thay đổi. Vui lòng tải lại trang và thử lại.'
  }

  // Conflict (concurrent modification)
  if (err.status === 409) {
    return 'Thao tác bị xung đột. Vui lòng tải lại và thử lại.'
  }

  // Bad request (validation)
  if (err.status === 400) {
    return 'Dữ liệu nhập không hợp lệ. Kiểm tra lại các trường.'
  }

  // Auth
  if (err.status === 401) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
  }
  if (err.status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.'
  }

  // Server error
  if (err.status >= 500) {
    return 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
  }

  return fallback
}
