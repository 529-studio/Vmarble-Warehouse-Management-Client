import { ApiClientError } from '@/lib/api/client'
import { normalizeAuthToken } from '@/lib/auth/token'
import type {
  ApproveLoadingPlanInput,
  LoadingPlan,
  LoadingPlanDiff,
  LoadingPlanUploadResult,
} from '@/types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'

function buildUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return new URL(`${BASE_URL}${path}`, base).toString()
}

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = normalizeAuthToken(localStorage.getItem('auth_token'))
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 422 / 400 from POST /containers/:id/loading-plan returns a structured
 * `LoadingPlanUploadResult` body (with row-level errors), not the generic
 * `{ error: "..." }` shape. The error panel renders those rows directly,
 * so we surface the full result via this thrown class instead of forcing
 * the caller to parse `onError`.
 */
export class LoadingPlanUploadError extends Error {
  constructor(public status: number, public result: LoadingPlanUploadResult) {
    super(`upload rejected (${status})`)
    this.name = 'LoadingPlanUploadError'
  }
}

export interface UploadLoadingPlanInput {
  customerId: string
  file: File
  notes?: string
  excelUrl?: string
}

export const loadingPlansApi = {
  async getActiveForContainer(containerId: string): Promise<LoadingPlan | null> {
    const res = await fetch(buildUrl(`/containers/${containerId}/loading-plan`), {
      headers: { ...authHeader() },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiClientError(res.status, 'UNKNOWN', body?.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<LoadingPlan>
  },

  async upload(containerId: string, input: UploadLoadingPlanInput): Promise<LoadingPlanUploadResult> {
    const fd = new FormData()
    fd.append('customer_id', input.customerId)
    fd.append('file', input.file)
    if (input.notes) fd.append('notes', input.notes)
    if (input.excelUrl) fd.append('excel_url', input.excelUrl)

    const res = await fetch(buildUrl(`/containers/${containerId}/loading-plan`), {
      method: 'POST',
      headers: { ...authHeader() },
      body: fd,
    })

    if (res.status === 400 || res.status === 422) {
      const result = (await res.json().catch(() => ({}))) as LoadingPlanUploadResult
      throw new LoadingPlanUploadError(res.status, result)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiClientError(res.status, 'UNKNOWN', body?.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<LoadingPlanUploadResult>
  },

  async getById(id: string): Promise<LoadingPlan> {
    const res = await fetch(buildUrl(`/loading-plans/${id}`), {
      headers: { ...authHeader() },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiClientError(res.status, 'UNKNOWN', body?.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<LoadingPlan>
  },

  async approve(id: string, body: ApproveLoadingPlanInput = {}): Promise<LoadingPlan> {
    const res = await fetch(buildUrl(`/loading-plans/${id}/approve`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const respBody = await res.json().catch(() => null)
      throw new ApiClientError(res.status, 'UNKNOWN', respBody?.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<LoadingPlan>
  },

  async getDiff(id: string, against: string): Promise<LoadingPlanDiff> {
    const url = new URL(buildUrl(`/loading-plans/${id}/diff`))
    url.searchParams.set('against', against)
    const res = await fetch(url.toString(), { headers: { ...authHeader() } })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new ApiClientError(res.status, 'UNKNOWN', body?.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<LoadingPlanDiff>
  },
}
