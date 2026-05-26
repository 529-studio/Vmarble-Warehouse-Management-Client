import { useQuery } from '@tanstack/react-query'
import { salesOrdersApi } from '@/lib/api/sales-orders'
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
