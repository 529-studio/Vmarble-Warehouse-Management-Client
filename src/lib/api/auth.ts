/**
 * auth.ts — Login API.
 *
 * The backend exposes POST /api/auth/login (outside /api/v1 protected routes).
 * next.config rewrites /api/auth/:path* → backend /api/auth/:path* so we can
 * call it from the browser without CORS issues.
 */

import { apiClient } from './client'
import { User } from '@/types/api'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  role: string
  expires_at: string
}

export const authApi = {
  login: async (body: LoginRequest): Promise<LoginResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error ?? 'Login failed')
    }

    return res.json() as Promise<LoginResponse>
  },

  getMe: () => apiClient.get<User>('/users/me'),
}
