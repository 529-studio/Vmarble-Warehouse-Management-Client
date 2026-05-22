import { useEffect, useMemo } from 'react'
import {
  useInfiniteQuery,
  useQueryClient,
  type QueryKey,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api/client'
import type { CursorResult } from '@/types/api'

interface UseCursorListArgs<T> {
  queryKey: QueryKey
  fetchPage: (cursor: string | null) => Promise<CursorResult<T>>
  enabled?: boolean
  staleTime?: number
}

interface UseCursorListResult<T> {
  items: T[]
  hasMore: boolean
  fetchNextPage: () => void
  isFetchingNextPage: boolean
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: unknown
  refetch: () => void
}

/**
 * Wraps `useInfiniteQuery` for the BE cursor envelope:
 *   { items, next_cursor, has_more }
 *
 * Round-trips `next_cursor` as the page param. On HTTP 400 (invalid/expired
 * cursor) the cache for this key is cleared so the next render restarts from
 * page 1, and the user gets a toast asking them to reload.
 *
 * Convention reminder: cursor is opaque — never parse it on FE.
 */
export function useCursorList<T>({
  queryKey,
  fetchPage,
  enabled = true,
  staleTime = 30_000,
}: UseCursorListArgs<T>): UseCursorListResult<T> {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    enabled,
    staleTime,
  } satisfies UseInfiniteQueryOptions<
    CursorResult<T>,
    Error,
    { pages: CursorResult<T>[]; pageParams: (string | null)[] },
    QueryKey,
    string | null
  >)

  // Surface invalid-cursor errors and reset to page 1.
  useEffect(() => {
    if (!query.isError) return
    const err = query.error
    if (err instanceof ApiClientError && err.status === 400) {
      toast.warning('Danh sách đã thay đổi. Vui lòng tải lại.')
      queryClient.removeQueries({ queryKey })
    }
  }, [query.isError, query.error, queryClient, queryKey])

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  )

  const lastPage = query.data?.pages[query.data.pages.length - 1]
  const hasMore = lastPage?.has_more ?? false

  return {
    items,
    hasMore,
    fetchNextPage: () => query.fetchNextPage(),
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: () => query.refetch(),
  }
}
