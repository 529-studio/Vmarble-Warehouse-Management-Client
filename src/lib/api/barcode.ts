import type { BarcodeRecord, ScanEvent, ScanCheckpoint } from '@/types/api'
import { apiClient } from './client'

export const barcodeApi = {
  getQrUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/barcode/${id}/qr`,

  getLabelUrl: (id: string) =>
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/barcode/${id}/label`,

  getById: (id: string) => apiClient.get<BarcodeRecord>(`/barcode/${id}`),

  batchPrint: (barcodeIds: string[]) =>
    // Returns a PDF blob URL — open in new tab to trigger browser print
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/barcode/batch-print?ids=${barcodeIds.join(',')}`,

  recordScan: (input: {
    barcodeId: string
    checkpoint: ScanCheckpoint
    scannedBy: string
  }) => apiClient.post<ScanEvent>('/barcode/scan', input),
}
