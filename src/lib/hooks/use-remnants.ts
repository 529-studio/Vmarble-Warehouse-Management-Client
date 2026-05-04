import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { remnantsApi, sheetsApi, storageLocationsApi, type RemnantsFilter, type SheetsFilter } from '@/lib/api/remnants'
import type { RemnantSuggestion, StorageLocation } from '@/types/api'

export const REMNANTS_KEY = 'remnants'

export function useRemnants(filter: RemnantsFilter = {}) {
  return useQuery({
    queryKey: [REMNANTS_KEY, filter],
    queryFn: () => remnantsApi.list(filter),
    // Keep previous page data visible while the next page loads
    placeholderData: (prev) => prev,
  })
}

/**
 * Returns up to `limit` remnant suggestions for the given work order dimensions
 * using the backend Best Fit + FIFO algorithm.
 * GET /api/v1/inventory/remnants/suggestions?length_mm=X&width_mm=Y&limit=N
 */
export function useSuggestRemnants(
  workOrderId: string,
  dimensions: { length_mm: number; width_mm: number } | undefined,
  limit = 5,
) {
  return useQuery({
    queryKey: [REMNANTS_KEY, 'suggest', workOrderId, dimensions],
    queryFn: () =>
      remnantsApi.suggest(dimensions!.length_mm, dimensions!.width_mm, limit),
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

/** Fetches a single remnant by UUID. Disabled when id is empty. */
export function useRemnant(id: string) {
  return useQuery({
    queryKey: [REMNANTS_KEY, 'detail', id],
    queryFn: () => remnantsApi.getById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

/** Opens remnant stock label PDF in a new tab. */
export function useOpenRemnantLabelPdf() {
  return useMutation({
    mutationFn: async (remnantId: string) => {
      const blob = await remnantsApi.getRemnantLabelPdfBlob(remnantId)
      return URL.createObjectURL(blob)
    },
  })
}

/** Mutation to assign a remnant to a physical storage bin by location barcode. */
export function useStockRemnant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ remnantId, locationBarcode }: { remnantId: string; locationBarcode: string }) =>
      remnantsApi.stock(remnantId, locationBarcode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [REMNANTS_KEY] })
    },
  })
}

export const SHEETS_KEY = 'sheets'

export const STORAGE_LOCATIONS_KEY = 'storage-locations'

/**
 * Fetches all active storage locations. Cached for 5 minutes since shelf
 * configuration rarely changes during a shift.
 * Returns a Map<id, StorageLocation> for O(1) lookup per remnant card.
 */
export function useStorageLocations() {
  return useQuery({
    queryKey: [STORAGE_LOCATIONS_KEY],
    queryFn: async () => {
      const locs = await storageLocationsApi.list()
      const map = new Map<string, StorageLocation>()
      for (const loc of locs ?? []) {
        map.set(loc.id, loc)
      }
      return map
    },
    staleTime: 5 * 60_000,
  })
}

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
