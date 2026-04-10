import type { BarcodeRecord, ScanEvent, ScanCheckpoint, GenerateBarcodeInput } from '@/types/api'
import { apiClient } from './client'

export const barcodeApi = {
  generate: (input: GenerateBarcodeInput) =>
    apiClient.post<BarcodeRecord>('/barcodes', input),

  getById: (id: string) => apiClient.get<BarcodeRecord>(`/barcodes/${id}`),

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
