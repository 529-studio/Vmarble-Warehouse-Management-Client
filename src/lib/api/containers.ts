import { apiClient } from '@/lib/api/client'
import type {
  Container,
  ContainersFilter,
  PagedResult,
} from '@/types/api'

export const containersApi = {
  /** GET /api/v1/containers — paginated list (no `lines` hydrated). */
  list: (filter: ContainersFilter = {}) =>
    apiClient.get<PagedResult<Container>>('/containers', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/containers/:id — full record incl. `lines`. */
  getById: (id: string) =>
    apiClient.get<Container>(`/containers/${id}`),
}
