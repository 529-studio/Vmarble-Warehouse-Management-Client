import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/dashboard'

export const DASHBOARD_KEY = 'dashboard-overview'
export const WIP_PIPELINE_KEY = 'dashboard-wip-pipeline'

// SSE (#194) is the primary push channel. The 120 s polling interval is a
// fallback for the case where the EventSource drops between background tab
// awake / proxy timeout — the dashboard reflects reality within ~2 minutes
// even if the realtime channel is broken.
const FALLBACK_REFETCH_MS = 120_000

export function useDashboardOverview() {
  return useQuery({
    queryKey: [DASHBOARD_KEY],
    queryFn: dashboardApi.getOverview,
    staleTime: 30_000,
    refetchInterval: FALLBACK_REFETCH_MS,
  })
}

export function useWIPPipeline() {
  return useQuery({
    queryKey: [WIP_PIPELINE_KEY],
    queryFn: dashboardApi.getWIPPipeline,
    staleTime: 30_000,
    refetchInterval: FALLBACK_REFETCH_MS,
  })
}
