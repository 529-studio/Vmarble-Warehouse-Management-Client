import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Pagination bar with Prev / page numbers / Next controls.
 * Matches Vietnamese labels as used throughout the dashboard.
 */
export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  className,
}: DataPaginationProps) {
  if (totalPages <= 1 && totalItems === 0) return null

  const isFirst = currentPage <= 1
  const isLast = currentPage >= totalPages

  // Build visible page numbers: always show first, last, and window around current
  const pages = buildPageWindows(currentPage, totalPages)

  const firstItem = (currentPage - 1) * limit + 1
  const lastItem = Math.min(currentPage * limit, totalItems)

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}>
      {/* Info */}
      <p className="text-sm text-muted-foreground">
        {totalItems === 0
          ? 'Không có bản ghi nào'
          : `Hiển thị ${firstItem}–${lastItem} / ${totalItems} bản ghi`}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* First */}
        <Button
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex"
          disabled={isFirst}
          onClick={() => onPageChange(1)}
          aria-label="Trang đầu"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        {/* Prev */}
        <Button
          variant="outline"
          size="icon"
          disabled={isFirst}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(p as number)}
              aria-label={`Trang ${p}`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </Button>
          ),
        )}

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          disabled={isLast}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Trang tiếp"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Last */}
        <Button
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex"
          disabled={isLast}
          onClick={() => onPageChange(totalPages)}
          aria-label="Trang cuối"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/** Returns page numbers with ellipsis placeholders, e.g. [1, '...', 4, 5, 6, '...', 10] */
function buildPageWindows(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const delta = 1 // siblings around current
  const result: (number | '...')[] = []
  const rangeStart = Math.max(2, current - delta)
  const rangeEnd = Math.min(total - 1, current + delta)

  result.push(1)

  if (rangeStart > 2) result.push('...')

  for (let i = rangeStart; i <= rangeEnd; i++) result.push(i)

  if (rangeEnd < total - 1) result.push('...')

  result.push(total)

  return result
}
