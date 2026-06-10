import { normalizeAuthToken } from '@/lib/auth/token'
import type { BarcodeRecord, BatchPrintInput, CursorResult, ScanEvent, ScanResult, ScanCheckpoint, GenerateBarcodeInput } from '@/types/api'
import { ApiClientError, apiClient } from './client'

function buildApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  return new URL(`${baseUrl}${path}`, base).toString()
}

async function fetchPdfBlob(path: string, init?: RequestInit) {
  const token =
    typeof window !== 'undefined'
      ? normalizeAuthToken(localStorage.getItem('auth_token'))
      : null

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/pdf',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const code: string = body?.code ?? 'UNKNOWN'
    const message: string = body?.message ?? body?.error ?? `HTTP ${response.status}`
    throw new ApiClientError(response.status, code, message, body?.details)
  }

  return response.blob()
}

export const barcodeApi = {
  generate: (input: GenerateBarcodeInput) =>
    apiClient.post<BarcodeRecord>('/barcodes', input),

  getById: (id: string) => apiClient.get<BarcodeRecord>(`/barcodes/${id}`),

  /** GET /api/proxy/barcodes?work_order_id=:id */
  listByWorkOrder: (workOrderId: string) =>
    apiClient.get<BarcodeRecord[]>('/barcodes', { params: { work_order_id: workOrderId } }),

  /**
   * GET /api/proxy/barcodes/:id/scans
   * BE returns the cursor envelope; consumers (work-order detail tab, /barcodes
   * latest-checkpoint badge) only need a flat list of recent scans, so we
   * fetch the first page (limit=100) and unwrap. Migrate to useCursorList if
   * a dedicated full-history viewer page is added.
   */
  listScans: async (barcodeId: string): Promise<ScanEvent[]> => {
    const res = await apiClient.get<CursorResult<ScanEvent>>(
      `/barcodes/${barcodeId}/scans`,
      { params: { limit: 100 } },
    )
    return res.items
  },

  /** POST /api/proxy/barcodes/:id/scans
   * scanned_by UUID is extracted server-side from the JWT — do not send it.
   * Optional device_id, device_name, shift are forwarded for audit metadata.
   */
  recordScan: (input: {
    barcodeId: string
    checkpoint: ScanCheckpoint
    deviceId?: string
    deviceName?: string
    shift?: string
    note?: string
  }) =>
    apiClient.post<ScanResult>(`/barcodes/${input.barcodeId}/scans`, {
      checkpoint: input.checkpoint,
      ...(input.deviceId ? { device_id: input.deviceId } : {}),
      ...(input.deviceName ? { device_name: input.deviceName } : {}),
      ...(input.shift ? { shift: input.shift } : {}),
      ...(input.note ? { note: input.note } : {}),
    }),

  getLabelPdfBlob: (barcodeId: string) =>
    fetchPdfBlob(`/barcodes/${barcodeId}/label.pdf`, { method: 'GET' }),

  /** POST /api/proxy/barcodes/batch-print — returns a single combined PDF. */
  batchLabelPdfBlob: (input: BatchPrintInput) =>
    fetchPdfBlob('/barcodes/batch-print', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}


