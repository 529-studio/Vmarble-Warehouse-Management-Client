import { apiClient } from '@/lib/api/client'
import type { SKU, CreateSKUInput, BOMResponse, SetBOMInput, BOMVariant, CreateBOMVariantInput, PagedResult } from '@/types/api'

export interface SKUFilter {
  page?: number
  limit?: number
  search?: string
}

export const skusApi = {
  list: (filter: SKUFilter = {}) =>
    apiClient.get<PagedResult<SKU>>('/skus', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  create: (input: CreateSKUInput) =>
    apiClient.post<SKU>('/skus', input),

  getById: (skuId: string) =>
    apiClient.get<SKU>(`/skus/${skuId}`),

  getBOM: (skuId: string, variantCode?: string) =>
    apiClient.get<BOMResponse>(`/skus/${skuId}/bom`, {
      params: variantCode ? { variant: variantCode } : undefined,
    }),

  setBOM: (skuId: string, input: SetBOMInput) =>
    apiClient.put<BOMResponse>(`/skus/${skuId}/bom`, input),

  listVariants: (skuId: string) =>
    apiClient.get<BOMVariant[]>(`/skus/${skuId}/variants`),

  createVariant: (skuId: string, input: CreateBOMVariantInput) =>
    apiClient.post<BOMVariant>(`/skus/${skuId}/variants`, input),
}
