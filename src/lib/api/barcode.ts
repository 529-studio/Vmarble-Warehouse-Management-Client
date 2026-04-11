import type { BarcodeRecord, ScanEvent, ScanCheckpoint, GenerateBarcodeInput } from '@/types/api'
import { apiClient } from './client'

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
}
