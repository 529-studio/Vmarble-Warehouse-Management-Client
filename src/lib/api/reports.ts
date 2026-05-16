import { ApiClientError } from '@/lib/api/client'
import { normalizeAuthToken } from '@/lib/auth/token'

export type ExportReport =
  | 'costings'
  | 'purchase-orders'
  | 'skus'
  | 'work-orders'
  | 'waste'

export interface ExportFilter {
  /** Inclusive ISO date YYYY-MM-DD lower bound on `created_at`. */
  from?: string
  /** Inclusive ISO date YYYY-MM-DD upper bound (BE treats as exclusive end-of-day). */
  to?: string
}

export interface ExportResult {
  blob: Blob
  filename: string
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function buildApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  return new URL(`${baseUrl}${path}`, base)
}

/**
 * Pulls the filename out of a Content-Disposition header. Handles both the
 * RFC 5987 `filename*=UTF-8''<encoded>` form and the legacy quoted `filename=`
 * form. Returns null if neither is present so the caller can fall back to a
 * sensible default.
 */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const star = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // fall through to non-encoded variant
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i)
  return plain?.[1]?.trim() ?? null
}

function defaultFilename(report: ExportReport, filter: ExportFilter): string {
  const from = filter.from ?? 'all'
  const to = filter.to ?? 'all'
  return `${report}_${from}_${to}.xlsx`
}

export const reportsApi = {
  /**
   * GET /api/v1/reports/export/{report}.xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Restricted to admin + accountant on the BE; the FE also gates the button
   * via `can(role, 'generate', 'reports')`.
   */
  async exportXlsx(report: ExportReport, filter: ExportFilter = {}): Promise<ExportResult> {
    const url = buildApiUrl(`/reports/export/${report}.xlsx`)
    if (filter.from) url.searchParams.set('from', filter.from)
    if (filter.to) url.searchParams.set('to', filter.to)

    const token =
      typeof window !== 'undefined'
        ? normalizeAuthToken(localStorage.getItem('auth_token'))
        : null

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: XLSX_MIME,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const code: string = body?.code ?? 'UNKNOWN'
      const message: string = body?.message ?? body?.error ?? `HTTP ${response.status}`
      throw new ApiClientError(response.status, code, message, body?.details)
    }

    const filename =
      parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
      defaultFilename(report, filter)

    return { blob: await response.blob(), filename }
  },
}
