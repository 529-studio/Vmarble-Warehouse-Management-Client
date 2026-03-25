import type {
  Remnant,
  RemnantLineage,
  PaginatedResponse,
  RemnantSuggestion,
  SuggestAllocationInput,
  SuggestAllocationResponse,
  OverflowStatus,
  StorageLocation,
} from '@/types/api'
import { apiClient } from './client'

// ── Remnant list filters ─────────────────────────────────────────────────────

export interface RemnantsFilter {
  minLengthMm?: number
  minWidthMm?: number
  materialType?: string
  status?: string
  locationId?: string
  page?: number
  pageSize?: number
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const remnantsApi = {
  list: (filter: RemnantsFilter = {}) =>
    apiClient.get<PaginatedResponse<Remnant>>('/remnants', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  getById: (id: string) => apiClient.get<Remnant>(`/remnants/${id}`),

  getLineage: (id: string) =>
    apiClient.get<RemnantLineage>(`/remnants/${id}/lineage`),

  assignLocation: (id: string, locationId: string) =>
    apiClient.put<Remnant>(`/remnants/${id}/location`, { locationId }),

  suggestAllocation: (input: SuggestAllocationInput) =>
    apiClient.post<SuggestAllocationResponse>(
      '/inventory/suggest-allocation',
      input,
    ),

  allocate: (remnantId: string, workOrderId: string) =>
    apiClient.post<Remnant>('/inventory/allocate', { remnantId, workOrderId }),

  releaseAllocation: (remnantId: string) =>
    apiClient.post<Remnant>('/inventory/release-allocation', { remnantId }),

  getOverflowStatus: () =>
    apiClient.get<OverflowStatus>('/inventory/overflow-status'),
}

export const storageLocationsApi = {
  list: () => apiClient.get<StorageLocation[]>('/storage-locations'),

  getById: (id: string) =>
    apiClient.get<StorageLocation>(`/storage-locations/${id}`),

  create: (data: Omit<StorageLocation, 'id' | 'barcode'>) =>
    apiClient.post<StorageLocation>('/storage-locations', data),

  update: (id: string, data: Partial<StorageLocation>) =>
    apiClient.put<StorageLocation>(`/storage-locations/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/storage-locations/${id}`),
}
