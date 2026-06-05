import { apiClient } from '@/lib/api/client'
import type {
  Container,
  CreateVesselInput,
  PagedResult,
  UpdateVesselInput,
  Vessel,
  VesselsFilter,
} from '@/types/api'

export const vesselsApi = {
  /** GET /api/v1/vessels — paginated vessel list. */
  list: (filter: VesselsFilter = {}) =>
    apiClient.get<PagedResult<Vessel>>('/vessels', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/vessels/:id — single vessel. */
  getById: (id: string) =>
    apiClient.get<Vessel>(`/vessels/${id}`),

  /** POST /api/v1/vessels — create vessel. */
  create: (body: CreateVesselInput) =>
    apiClient.post<Vessel>('/vessels', body),

  /** PATCH /api/v1/vessels/:id — update vessel. */
  update: (id: string, body: UpdateVesselInput) =>
    apiClient.patch<Vessel>(`/vessels/${id}`, body),

  /** DELETE /api/v1/vessels/:id — delete vessel. */
  delete: (id: string) =>
    apiClient.delete<void>(`/vessels/${id}`),

  /** GET /api/v1/vessels/:id/containers — containers assigned to vessel. */
  listContainers: (id: string) =>
    apiClient.get<Container[]>(`/vessels/${id}/containers`),
}
