import { lotsApi, type LotsFilter } from '@/lib/api/lots'
import { useCursorList } from '@/lib/hooks/use-cursor-list'

export const LOTS_KEY = 'lots'

export function useLotList(filter: Omit<LotsFilter, 'cursor'> = {}) {
  return useCursorList({
    queryKey: [LOTS_KEY, 'list', filter],
    fetchPage: (cursor) => lotsApi.list({ ...filter, cursor: cursor ?? undefined }),
    staleTime: 30_000,
  })
}
