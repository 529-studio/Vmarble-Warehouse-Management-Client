import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { barcodeApi } from '@/lib/api/barcode'
import { ApiClientError } from '@/lib/api/client'
import type { GenerateBarcodeInput, BarcodeRecord } from '@/types/api'

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
      if (err instanceof ApiClientError) {
        toast.error(`Lỗi: ${err.message}`)
      } else {
        toast.error('Tạo barcode thất bại')
      }
    },
  })
}
