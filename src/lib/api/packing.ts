import { apiClient } from '@/lib/api/client'
import type {
  FGDefect,
  PackingScanResult,
  ReportDefectInput,
} from '@/types/api'

export const packingApi = {
  /** POST /api/v1/packing/scan — barcode → FG + suggested containers. */
  scan: (barcodeId: string) =>
    apiClient.post<PackingScanResult>('/packing/scan', { barcode_id: barcodeId }),

  /** POST /api/v1/packing/defect — flip the FG to DEFECT, log reason/photos. */
  reportDefect: (body: ReportDefectInput) =>
    apiClient.post<FGDefect>('/packing/defect', body),
}
