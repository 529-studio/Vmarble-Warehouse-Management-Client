'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export interface PageParamsState {
  page: number
  search: string
  limit: number
  getParam: (key: string) => string | null
  /** Update the page number (resets to 1 when search changes) */
  setPage: (page: number) => void
  /** Update the search term and reset to page 1 */
  setSearch: (search: string) => void
  /** Update the page size and reset to page 1 */
  setLimit: (limit: number) => void
  /** Update any query-string value; pass empty/undefined to remove. */
  setParam: (key: string, value?: string) => void
  /** Update multiple query-string values atomically and reset to page 1. */
  setParams: (updates: Record<string, string | undefined>) => void
}

/**
 * Reads `page`, `search`, and `limit` from the URL query string and exposes
 * setters that push a new URL — enabling browser Back/Forward and shareable
 * links without a full page reload.
 *
 * @param defaultLimit - Items per page when `?limit=` is absent (default: 10)
 */
export function usePageParams(defaultLimit = 10): PageParamsState {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.max(1, Number(searchParams.get('limit') ?? String(defaultLimit)))
  const search = searchParams.get('search') ?? ''

  const push = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setPage = useCallback(
    (p: number) => push({ page: String(p) }),
    [push],
  )

  const setSearch = useCallback(
    (s: string) => push({ search: s || undefined, page: '1' }),
    [push],
  )

  const setLimit = useCallback(
    (l: number) => push({ limit: String(l), page: '1' }),
    [push],
  )

  const getParam = useCallback(
    (key: string) => searchParams.get(key),
    [searchParams],
  )

  const setParam = useCallback(
    (key: string, value?: string) => push({ [key]: value, page: '1' }),
    [push],
  )

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => push({ ...updates, page: '1' }),
    [push],
  )

  return { page, search, limit, getParam, setPage, setSearch, setLimit, setParam, setParams }
}
