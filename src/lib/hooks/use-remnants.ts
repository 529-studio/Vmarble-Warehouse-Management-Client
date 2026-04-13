import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remnantsApi, sheetsApi, type RemnantsFilter, type SheetsFilter } from '@/lib/api/remnants'
import type { Remnant, RemnantSuggestion } from '@/types/api'

export const REMNANTS_KEY = 'remnants'

export function useRemnants(filter: RemnantsFilter = {}) {
  return useQuery({
    queryKey: [REMNANTS_KEY, filter],
    queryFn: () => remnantsApi.list(filter),
    // Keep previous page data visible while the next page loads
    placeholderData: (prev) => prev,
  })
}

// ── Client-side remnant scoring ───────────────────────────────────────────────
//
// NOTE: POST /inventory/suggest-allocation is planned but not yet implemented in
// the backend (as of 2026-04-12). This hook approximates Best Fit by calling
// GET /inventory/remnants with dimension filters, then scoring client-side.
// Replace with the real endpoint when the backend ships it.
//
// Scoring: fitScore = requiredArea / remnantArea  (1.0 = perfect fit, no waste)
// ageScore and combinedScore are set to fitScore as placeholders.

function scoreRemnants(
  remnants: Remnant[],
  required: { length_mm: number; width_mm: number },
  limit: number,
): RemnantSuggestion[] {
  const requiredArea = required.length_mm * required.width_mm
  if (requiredArea <= 0) return []

  return remnants
    .map((remnant): RemnantSuggestion | null => {
      // Prefer bounding-box dimensions (usable area after chips), fall back to full dims
      const rl = remnant.bounding_box_length_mm ?? remnant.dimensions.length_mm
      const rw = remnant.bounding_box_width_mm ?? remnant.dimensions.width_mm
      const remnantArea = rl * rw
      if (remnantArea <= 0) return null

      const wasteAreaMm2 = Math.max(0, remnantArea - requiredArea)
      const wastePct = (wasteAreaMm2 / remnantArea) * 100
      const fitScore = Math.min(1, requiredArea / remnantArea)

      return {
        remnant,
        fitScore,
        ageScore: 0,          // not computed client-side
        combinedScore: fitScore,
        wasteAreaMm2,
        wastePct,
      }
    })
    .filter((s): s is RemnantSuggestion => s !== null)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit)
}

/**
 * Returns up to `limit` remnant suggestions for the given work order dimensions,
 * scored by best fit (least waste). Uses client-side scoring via GET /remnants.
 */
export function useSuggestRemnants(
  workOrderId: string,
  dimensions: { length_mm: number; width_mm: number } | undefined,
  limit = 5,
) {
  return useQuery({
    queryKey: [REMNANTS_KEY, 'suggest', workOrderId, dimensions],
    queryFn: async () => {
      if (!dimensions) return []
      const result = await remnantsApi.list({
        min_length_mm: dimensions.length_mm,
        min_width_mm: dimensions.width_mm,
        status: 'AVAILABLE',
        limit: 20,
      })
      return scoreRemnants(result.items ?? [], dimensions, limit)
    },
    enabled: !!workOrderId && !!dimensions,
    staleTime: 30_000,
  })
}

export function useAllocateRemnant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ remnantId, workOrderId }: { remnantId: string; workOrderId: string }) =>
      remnantsApi.allocate(remnantId, workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REMNANTS_KEY] })
    },
  })
}

export const SHEETS_KEY = 'sheets'

/**
 * Fetches AVAILABLE board sheets for sheet selection.
 * Only runs when `enabled` is true — pass false to skip the request
 * (e.g. when a remnant_id is already selected, or sheet picker is not shown).
 */
export function useAvailableSheets(filter: SheetsFilter = {}, enabled = true) {
  return useQuery({
    queryKey: [SHEETS_KEY, filter],
    queryFn: () => sheetsApi.list({ ...filter, status: 'AVAILABLE', limit: filter.limit ?? 50 }),
    enabled,
    staleTime: 30_000,
  })
}
