import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { packingApi } from '@/lib/api/packing'
import { CONTAINERS_KEY } from '@/lib/hooks/use-containers'
import type { FGPoolFilter, ReassignFGInput, ReportDefectInput } from '@/types/api'

export const PACKING_KEY = 'packing'
export const FG_POOL_KEY = 'fg-pool'

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

/** Paginated FG pool list. */
export function useFGPoolList(filter: FGPoolFilter = {}) {
  return useQuery({
    queryKey: [FG_POOL_KEY, filter],
    queryFn: () => packingApi.fgPoolList(filter),
  })
}

/** Single FG item by id. */
export function useFGPoolItem(id: string | null) {
  return useQuery({
    queryKey: [FG_POOL_KEY, id],
    queryFn: () => packingApi.fgPoolGetById(id!),
    enabled: !!id,
  })
}

/** Reassignment audit trail for one FG item. */
export function useFGPoolHistory(id: string | null) {
  return useQuery({
    queryKey: [FG_POOL_KEY, id, 'history'],
    queryFn: () => packingApi.fgPoolHistory(id!),
    enabled: !!id,
  })
}

/** Reassign FG to a different SO line. Invalidates list + item + history. */
export function useReassignFG(fgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ReassignFGInput) => packingApi.reassignFG(fgId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FG_POOL_KEY] })
    },
  })
}

