import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { barcodeApi } from '@/lib/api/barcode'
import { mapApiErrorVi } from '@/lib/api/client'
import type { BatchPrintInput, GenerateBarcodeInput, BarcodeRecord, ScanEvent } from '@/types/api'

export const BARCODES_KEY = 'barcodes'
export const SCAN_EVENTS_KEY = 'scan-events'

export function useBarcode(id: string) {
  return useQuery({
    queryKey: [BARCODES_KEY, id],
    queryFn: () => barcodeApi.getById(id),
    enabled: !!id,
  })
}

export function useBarcodesForWorkOrder(workOrderId: string) {
  return useQuery({
    queryKey: [BARCODES_KEY, 'by-work-order', workOrderId],
    queryFn: () => barcodeApi.listByWorkOrder(workOrderId),
    enabled: !!workOrderId,
  })
}

/**
 * Fan-out parallel scan-event queries — one per barcode.
 * The /barcodes management screen needs the latest checkpoint per row, but the
 * BE has no aggregated endpoint yet, so we fetch them in parallel and let
 * TanStack Query dedupe and cache each barcode's scans individually.
 */
export function useBarcodeScansBatch(barcodeIds: string[]) {
  return useQueries({
    queries: barcodeIds.map((id) => ({
      queryKey: [SCAN_EVENTS_KEY, id],
      queryFn: () => barcodeApi.listScans(id),
      enabled: !!id,
      staleTime: 30_000,
    })),
  })
}

export function useBarcodeScanEvents(barcodeId: string) {
  return useQuery({
    queryKey: [SCAN_EVENTS_KEY, barcodeId],
    queryFn: () => barcodeApi.listScans(barcodeId),
    enabled: !!barcodeId,
  })
}

export function useGenerateBarcode(opts?: { onSuccess?: (bc: BarcodeRecord) => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateBarcodeInput) => barcodeApi.generate(input),
    onSuccess: (bc, variables) => {
      toast.success('Đã tạo barcode thành công')
      queryClient.invalidateQueries({
        queryKey: [BARCODES_KEY, 'by-work-order', variables.work_order_id],
      })
      opts?.onSuccess?.(bc)
    },
    onError: (err: unknown) => {
      toast.error(mapApiErrorVi(err, 'Tạo barcode thất bại'))
    },
  })
}

export function useOpenBarcodeLabelPdf() {
  return useMutation({
    mutationFn: async (barcodeId: string) => {
      const blob = await barcodeApi.getLabelPdfBlob(barcodeId)
      return URL.createObjectURL(blob)
    },
  })
}

/**
 * Open a single combined PDF for multiple barcodes.
 * Caller is responsible for revoking the returned object URL after print.
 */
export function useBatchPrintBarcodeLabels() {
  return useMutation({
    mutationFn: async (input: BatchPrintInput) => {
      const blob = await barcodeApi.batchLabelPdfBlob(input)
      return URL.createObjectURL(blob)
    },
    onError: (err: unknown) => {
      toast.error(mapApiErrorVi(err, 'In hàng loạt thất bại'))
    },
  })
}

/** Last scan event per barcode, or null if not scanned yet. */
export function pickLatestScan(events: ScanEvent[] | undefined): ScanEvent | null {
  if (!events?.length) return null
  return events.reduce((latest, e) =>
    new Date(e.scanned_at) > new Date(latest.scanned_at) ? e : latest,
  )
}

