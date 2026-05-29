import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapApiErrorVi } from '@/lib/api/client'
import { scrapSalesApi } from '@/lib/api/scrap-sales'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import { WASTE_REPORT_KEY } from '@/lib/hooks/use-waste-report'
import type { CreateScrapSaleInput, ScrapSalesFilter } from '@/types/api'

export const SCRAP_SALES_KEY = 'scrap-sales'

/**
 * Cursor-paginated scrap-sales list. Filter is captured in the query key so
 * each (from, to, material) combination caches independently — this matches
 * how the waste report filter is treated and keeps the cache warm when users
 * pivot between materials.
 */
export function useScrapSales(filter: Omit<ScrapSalesFilter, 'cursor'> = {}) {
  return useCursorList({
    queryKey: [SCRAP_SALES_KEY, 'list', filter],
    fetchPage: (cursor) => scrapSalesApi.list({ ...filter, cursor }),
    staleTime: 30_000,
  })
}

/**
 * BR-C06: a new scrap sale offsets the waste cost in the same period, so we
 * invalidate both scrap-sales and the waste-report cache on success.
 */
export function useCreateScrapSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateScrapSaleInput) => scrapSalesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCRAP_SALES_KEY] })
      qc.invalidateQueries({ queryKey: [WASTE_REPORT_KEY] })
      toast.success('Đã ghi nhận lượt bán phế liệu')
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Ghi nhận bán phế liệu thất bại')),
  })
}
