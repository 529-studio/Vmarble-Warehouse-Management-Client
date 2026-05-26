import { apiClient } from '@/lib/api/client'
import type {
  PagedResult,
  SalesOrder,
  SalesOrdersFilter,
} from '@/types/api'

export const salesOrdersApi = {
  /** GET /api/v1/sales-orders — paginated, filter by status / customer_id. */
  list: (filter: SalesOrdersFilter = {}) =>
    apiClient.get<PagedResult<SalesOrder>>('/sales-orders', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/sales-orders/:id — full record incl. `lines`. */
  getById: (id: string) =>
    apiClient.get<SalesOrder>(`/sales-orders/${id}`),
}
