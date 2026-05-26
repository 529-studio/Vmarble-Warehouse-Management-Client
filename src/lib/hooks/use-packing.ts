import { useMutation, useQueryClient } from '@tanstack/react-query'
import { packingApi } from '@/lib/api/packing'
import { CONTAINERS_KEY } from '@/lib/hooks/use-containers'
import type { ReportDefectInput } from '@/types/api'

export const PACKING_KEY = 'packing'

/**
 * Scan one barcode. The kiosk handles errors inline (red flash + action
 * buttons), so we deliberately omit toast/onError here — the calling page
 * reads `mutation.error` to decide what to render.
 */
export function useScanFG() {
  return useMutation({
    mutationFn: (barcodeId: string) => packingApi.scan(barcodeId),
  })
}

/**
 * Flip an FG to DEFECT. BR-PK03: if the FG was RESERVED, BE auto-removes
 * its container_line; sweep the containers prefix so the kanban + loading
 * pages reflect immediately.
 */
export function useReportDefect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReportDefectInput) => packingApi.reportDefect(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTAINERS_KEY] })
      qc.invalidateQueries({ queryKey: [PACKING_KEY] })
    },
  })
}
