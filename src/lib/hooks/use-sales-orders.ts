import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salesOrdersApi } from '@/lib/api/sales-orders'
import { mapApiErrorVi } from '@/lib/api/client'
import type { SalesOrdersFilter } from '@/types/api'

export const SALES_ORDERS_KEY = 'sales-orders'

export function useSalesOrders(filter: SalesOrdersFilter = {}) {
  return useQuery({
    queryKey: [SALES_ORDERS_KEY, filter],
    queryFn: () => salesOrdersApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useSalesOrder(id: string | null) {
  return useQuery({
    queryKey: [SALES_ORDERS_KEY, 'detail', id],
    queryFn: () => salesOrdersApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => salesOrdersApi.confirm(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [SALES_ORDERS_KEY] })
      toast.success(`Đã xác nhận đơn hàng ${data.code}`)
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Xác nhận đơn hàng thất bại')),
  })
}

export function useCancelSalesOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      salesOrdersApi.cancel(id, { reason }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [SALES_ORDERS_KEY] })
      toast.success(`Đã huỷ đơn hàng ${data.code}`)
    },
    onError: (err) => toast.error(mapApiErrorVi(err, 'Huỷ đơn hàng thất bại')),
  })
}
