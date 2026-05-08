'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { authApi, type LoginRequest } from '@/lib/api/auth'
import { getDefaultRouteForRole } from '@/lib/auth/authorization'
import { normalizeAuthToken } from '@/lib/auth/token'

const TOKEN_KEY = 'auth_token'
const ROLE_KEY = 'auth_role'
const USERNAME_KEY = 'auth_username'
const LAST_LOGIN_KEY = 'auth_last_login'

// ── Cookie helpers ────────────────────────────────────────────────────────────
// We store the token in BOTH:
//  • localStorage — read by apiClient for Authorization headers
//  • a plain cookie — read by Next.js middleware to protect routes server-side

function setAuthCookies(token: string, role: string, expiresAt: string) {
  const expires = new Date(expiresAt).toUTCString()
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Strict`
  document.cookie = `${ROLE_KEY}=${encodeURIComponent(role)}; path=/; expires=${expires}; SameSite=Strict`
}

function clearAuthCookies() {
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`
  document.cookie = `${ROLE_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return normalizeAuthToken(localStorage.getItem(TOKEN_KEY))
}

export function getStoredUsername(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USERNAME_KEY)
}

export function getStoredLastLogin(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_LOGIN_KEY)
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(LAST_LOGIN_KEY)
  clearAuthCookies()
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseLoginReturn {
  login: (credentials: LoginRequest, redirectTo?: string | null) => Promise<void>
  isPending: boolean
  error: string | null
}

export function useLogin(): UseLoginReturn {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest, redirectTo?: string | null) => {
    setIsPending(true)
    setError(null)

    try {
      const res = await authApi.login(credentials)
      const token = normalizeAuthToken(res.token)
      if (!token) {
        throw new Error('Token đăng nhập không hợp lệ')
      }

      // Persist in localStorage (for apiClient) and cookie (for middleware).
      localStorage.setItem(TOKEN_KEY, token)
      setAuthCookies(token, res.role, res.expires_at)

      const destination = redirectTo || getDefaultRouteForRole(res.role)
      router.push(destination)
      router.refresh() // flush server-component cache after login
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại')
    } finally {
      setIsPending(false)
    }
  }

  return { login, isPending, error }
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
