import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi, type PlanFilter } from '@/lib/api/plans'
import { useCursorList } from '@/lib/hooks/use-cursor-list'
import type { CreatePlanInput } from '@/types/api'

export const PLANS_KEY = 'plans'

/**
 * Cursor-paginated list for the /plans page.
 * Use this in the list view — exposes `items`, `hasMore`, `fetchNextPage`, etc.
 */
export function usePlanList(filter: Omit<PlanFilter, 'cursor'> = {}) {
  return useCursorList({
    queryKey: [PLANS_KEY, 'list', filter],
    fetchPage: (cursor) => plansApi.list({ ...filter, cursor: cursor ?? undefined }),
    staleTime: 30_000,
  })
}

/**
 * Single-page fetch for dropdown / lookup callers (e.g. limit:20, status filter).
 * Returns the raw CursorResult — callers access `.items`.
 */
export function usePlans(filter: PlanFilter = {}) {
  return useQuery({
    queryKey: [PLANS_KEY, filter],
    queryFn: () => plansApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function usePlan(id: string | null) {
  return useQuery({
    queryKey: [PLANS_KEY, id],
    queryFn: () => plansApi.getById(id!),
    enabled: id !== null,
    staleTime: 30_000,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => plansApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}

export function useApprovePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => plansApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}

export function useCancelPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => plansApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLANS_KEY] })
    },
  })
}
