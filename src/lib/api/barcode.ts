import { normalizeAuthToken } from '@/lib/auth/token'
import type { BarcodeRecord, ScanEvent, ScanCheckpoint, GenerateBarcodeInput } from '@/types/api'
import { ApiClientError, apiClient } from './client'

function buildApiUrl(path: string) {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  return new URL(`${baseUrl}${path}`, base).toString()
}

export const barcodeApi = {
  generate: (input: GenerateBarcodeInput) =>
    apiClient.post<BarcodeRecord>('/barcodes', input),

  getById: (id: string) => apiClient.get<BarcodeRecord>(`/barcodes/${id}`),

  /** GET /api/proxy/barcodes?work_order_id=:id */
  listByWorkOrder: (workOrderId: string) =>
    apiClient.get<BarcodeRecord[]>('/barcodes', { params: { work_order_id: workOrderId } }),

  /** GET /api/proxy/barcodes/:id/scans */
  listScans: (barcodeId: string) =>
    apiClient.get<ScanEvent[]>(`/barcodes/${barcodeId}/scans`),

  /** POST /api/proxy/barcodes/:id/scans */
  recordScan: (input: {
    barcodeId: string
    checkpoint: ScanCheckpoint
    scannedBy: string
  }) =>
    apiClient.post<ScanEvent>(`/barcodes/${input.barcodeId}/scans`, {
      checkpoint: input.checkpoint,
      scanned_by: input.scannedBy,
    }),

  getLabelPdfBlob: async (barcodeId: string) => {
    const token =
      typeof window !== 'undefined'
        ? normalizeAuthToken(localStorage.getItem('auth_token'))
        : null

    const response = await fetch(buildApiUrl(`/barcodes/${barcodeId}/label`), {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const code: string = body?.code ?? 'UNKNOWN'
      const message: string = body?.message ?? body?.error ?? `HTTP ${response.status}`
      throw new ApiClientError(response.status, code, message, body?.details)
    }

    return response.blob()
  },
}
