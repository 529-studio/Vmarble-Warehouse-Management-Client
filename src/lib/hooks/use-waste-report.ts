import { useQuery } from '@tanstack/react-query'
import { costingApi } from '@/lib/api/costing'
import type { WasteReportFilter } from '@/types/api'

export const WASTE_REPORT_KEY = 'costing-waste-report'

export function useWasteReport(filter: WasteReportFilter = {}) {
  return useQuery({
    queryKey: [WASTE_REPORT_KEY, filter],
    queryFn: () => costingApi.wasteReport(filter),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  })
}
