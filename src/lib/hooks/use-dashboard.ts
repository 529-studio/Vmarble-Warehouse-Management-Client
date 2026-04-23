import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'

export const DASHBOARD_KEY = 'dashboard-overview'

export function useDashboardOverview() {
  return useQuery({
    queryKey: [DASHBOARD_KEY],
    queryFn: dashboardApi.getOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
