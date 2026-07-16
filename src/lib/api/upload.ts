import { apiClient } from '@/lib/api/client'
import type { PresignRequest, PresignResult } from '@/types/api'

export const uploadApi = {
  presign: (body: PresignRequest) =>
    apiClient.post<PresignResult>('/uploads/presign', body),
}
