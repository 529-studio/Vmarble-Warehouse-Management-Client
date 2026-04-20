import { apiClient } from './client'
import { User, CreateUserInput, UpdateUserInput } from '@/types/api'

export const usersApi = {
  /** List all users (admin only) */
  list: () => apiClient.get<User[]>('/admin/users'),

  /** Create a new user (admin only) */
  create: (data: CreateUserInput) => apiClient.post<User>('/admin/users', data),

  /** Update user info (admin only) */
  update: (id: string, data: UpdateUserInput) => apiClient.put<User>(`/admin/users/${id}`, data),

  /** Toggle user active status (admin only) */
  toggleActive: (id: string, active: boolean) =>
    apiClient.patch<void>(`/admin/users/${id}/active`, { is_active: active }),
}
