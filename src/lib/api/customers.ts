import { apiClient } from '@/lib/api/client'
import type { Customer, CustomersFilter, PagedResult } from '@/types/api'

export const customersApi = {
  /** GET /api/v1/customers — paginated list. */
  list: (filter: CustomersFilter = {}) =>
    apiClient.get<PagedResult<Customer>>('/customers', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),
}
