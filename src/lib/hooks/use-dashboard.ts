import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'

export const DASHBOARD_KEY = 'dashboard-overview'
export const WIP_PIPELINE_KEY = 'dashboard-wip-pipeline'

export function useDashboardOverview() {
  return useQuery({
    queryKey: [DASHBOARD_KEY],
    queryFn: dashboardApi.getOverview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useWIPPipeline() {
  return useQuery({
    queryKey: [WIP_PIPELINE_KEY],
    queryFn: dashboardApi.getWIPPipeline,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
