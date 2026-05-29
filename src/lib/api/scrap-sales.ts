import { apiClient } from '@/lib/api/client'
import type {
  CreateScrapSaleInput,
  CursorResult,
  ScrapSale,
  ScrapSalesFilter,
} from '@/types/api'

export const scrapSalesApi = {
  /** GET /api/v1/scrap-sales — keyset paginated, ordered by created_at DESC. */
  list: (filter: ScrapSalesFilter = {}) =>
    apiClient.get<CursorResult<ScrapSale>>('/scrap-sales', {
      params: {
        cursor: filter.cursor ?? undefined,
        limit: filter.limit,
        from: filter.from,
        to: filter.to,
        material_id: filter.material_id,
      },
    }),

  /** POST /api/v1/scrap-sales — Phase A only accepts VND (BR-C05/C08). */
  create: (input: CreateScrapSaleInput) =>
    apiClient.post<ScrapSale>('/scrap-sales', input),
}
