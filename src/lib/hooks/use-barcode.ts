import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { barcodeApi } from '@/lib/api/barcode'
import { ApiClientError } from '@/lib/api/client'
import type { GenerateBarcodeInput, BarcodeRecord } from '@/types/api'

export function useGenerateBarcode(opts?: { onSuccess?: (bc: BarcodeRecord) => void }) {
  return useMutation({
    mutationFn: (input: GenerateBarcodeInput) => barcodeApi.generate(input),
    onSuccess: (bc) => {
      toast.success('Đã tạo barcode thành công')
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
