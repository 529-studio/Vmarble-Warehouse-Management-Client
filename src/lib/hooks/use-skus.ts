import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { skusApi, type SKUFilter } from '@/lib/api/skus'
import type { CreateSKUInput, SetBOMInput, CreateBOMVariantInput } from '@/types/api'

export const SKUS_KEY = 'skus'
export const BOM_KEY = 'bom'
export const VARIANTS_KEY = 'variants'

export function useSKUs(filter: SKUFilter = {}) {
  return useQuery({
    queryKey: [SKUS_KEY, filter],
    queryFn: () => skusApi.list(filter),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useCreateSKU() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSKUInput) => skusApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SKUS_KEY] })
    },
  })
}

export function useSKU(skuId: string | null) {
  return useQuery({
    queryKey: [SKUS_KEY, skuId],
    queryFn: () => skusApi.getById(skuId!),
    enabled: skuId !== null,
    staleTime: 30_000,
  })
}

/**
 * Fetches the BOM for a SKU. Pass `variantCode` to resolve a specific
 * variant; omit (or pass null/undefined) for the default variant.
 */
export function useSKUBOM(skuId: string | null, variantCode?: string | null) {
  return useQuery({
    queryKey: [SKUS_KEY, skuId, BOM_KEY, variantCode ?? null],
    queryFn: () => skusApi.getBOM(skuId!, variantCode ?? undefined),
    enabled: skuId !== null,
    staleTime: 30_000,
  })
}

export function useSetSKUBOM(skuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetBOMInput) => skusApi.setBOM(skuId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SKUS_KEY, skuId, BOM_KEY] })
    },
  })
}

export function useBOMVariants(skuId: string | null) {
  return useQuery({
    queryKey: [SKUS_KEY, skuId, VARIANTS_KEY],
    queryFn: () => skusApi.listVariants(skuId!),
    enabled: skuId !== null,
    staleTime: 30_000,
  })
}

export function useCreateBOMVariant(skuId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBOMVariantInput) => skusApi.createVariant(skuId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SKUS_KEY, skuId, VARIANTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [SKUS_KEY, skuId, BOM_KEY] })
    },
  })
}
