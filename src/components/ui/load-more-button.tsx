'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoadMoreButtonProps {
  hasMore: boolean
  isFetching: boolean
  onClick: () => void
  className?: string
  label?: string
  loadingLabel?: string
  /** When the list is empty, hide entirely; caller usually shows its own empty state. */
  hideWhenEmpty?: boolean
  itemCount?: number
}

/**
 * Shared "Load more" trigger for cursor-paginated lists.
 *
 * Hides itself when there is nothing more to fetch. Pair with `useCursorList`:
 *   <LoadMoreButton
 *     hasMore={list.hasMore}
 *     isFetching={list.isFetchingNextPage}
 *     onClick={list.fetchNextPage}
 *     itemCount={list.items.length}
 *   />
 */
export function LoadMoreButton({
  hasMore,
  isFetching,
  onClick,
  className,
  label = 'Tải thêm',
  loadingLabel = 'Đang tải…',
  hideWhenEmpty = true,
  itemCount,
}: LoadMoreButtonProps) {
  if (!hasMore) return null
  if (hideWhenEmpty && itemCount === 0) return null

  return (
    <div className={cn('flex justify-center py-3', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={isFetching}
        aria-busy={isFetching || undefined}
      >
        {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
        {isFetching ? loadingLabel : label}
      </Button>
    </div>
  )
}
