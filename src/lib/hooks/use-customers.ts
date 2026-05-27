import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/lib/api/customers'
import type { CustomersFilter } from '@/types/api'

export const CUSTOMERS_KEY = 'customers'

export function useCustomers(filter: CustomersFilter = {}) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, filter],
    queryFn: () => customersApi.list(filter),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}
