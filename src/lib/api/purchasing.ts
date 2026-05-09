import { apiClient } from './client'
import type {
  MaterialPurchaseOrder,
  CreateMPOInput,
  AddMPOItemInput,
  MPOItem,
  MPOFilter,
  PagedResult,
} from '@/types/api'

export const purchasingApi = {
  /** GET /api/v1/purchase-orders */
  list: (filter: MPOFilter = {}) =>
    apiClient.get<PagedResult<MaterialPurchaseOrder>>('/purchase-orders', {
      params: filter as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/purchase-orders/:id */
  getById: (id: string) =>
    apiClient.get<MaterialPurchaseOrder>(`/purchase-orders/${id}`),

  /** POST /api/v1/purchase-orders */
  create: (input: CreateMPOInput) =>
    apiClient.post<MaterialPurchaseOrder>('/purchase-orders', input),

  /** POST /api/v1/purchase-orders/:id/items */
  addItem: (id: string, input: AddMPOItemInput) =>
    apiClient.post<MPOItem>(`/purchase-orders/${id}/items`, input),

  /** DELETE /api/v1/purchase-orders/:id/items/:item_id */
  removeItem: (id: string, itemId: string) =>
    apiClient.delete<void>(`/purchase-orders/${id}/items/${itemId}`),

  /** POST /api/v1/purchase-orders/:id/order — DRAFT → ORDERED */
  order: (id: string) =>
    apiClient.post<MaterialPurchaseOrder>(`/purchase-orders/${id}/order`, {}),

  /** POST /api/v1/purchase-orders/:id/receive — ORDERED → RECEIVED */
  receive: (id: string) =>
    apiClient.post<MaterialPurchaseOrder>(`/purchase-orders/${id}/receive`, {}),

  /** POST /api/v1/purchase-orders/:id/cancel */
  cancel: (id: string) =>
    apiClient.post<MaterialPurchaseOrder>(`/purchase-orders/${id}/cancel`, {}),
}
