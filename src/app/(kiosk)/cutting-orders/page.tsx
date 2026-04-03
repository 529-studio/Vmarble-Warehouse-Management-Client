'use client'

import { Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CuttingOrderCard } from '@/components/kiosk/cutting-order-card'
import { useCuttingOrdersForKiosk } from '@/lib/hooks/use-cutting-orders'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'

// ── Loading skeleton ──────────────────────────────────────────────────────────

function CuttingOrderSkeleton() {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="space-y-2 p-4">
        <Skeleton className="h-[22px] w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-[48px] w-full rounded-none" />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-white px-6 py-12 text-center shadow-sm">
      {/* Inline SVG illustration — no external assets needed */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
        className="text-muted-foreground/30"
      >
        <rect x="10" y="20" width="60" height="44" rx="6" stroke="currentColor" strokeWidth="3" />
        <path d="M10 32h60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M24 47h32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 55h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M34 14 L40 8 L46 14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="40" y1="8" x2="40" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">
          Không có lệnh cắt hôm nay
        </p>
        <p className="text-sm text-muted-foreground">
          Kéo xuống để làm mới danh sách
        </p>
      </div>
    </div>
  )
}

// ── Pull-to-refresh indicator ─────────────────────────────────────────────────

interface PullIndicatorProps {
  isRefreshing: boolean
  pullProgress: number
}

function PullIndicator({ isRefreshing, pullProgress }: PullIndicatorProps) {
  const visible = isRefreshing || pullProgress > 0
  if (!visible) return null

  return (
    <div
      className="flex items-center justify-center py-3 transition-opacity"
      style={{ opacity: isRefreshing ? 1 : pullProgress }}
      aria-live="polite"
      aria-label={isRefreshing ? 'Đang làm mới…' : 'Kéo để làm mới'}
    >
      <Loader2
        className={cn('size-6 text-primary', isRefreshing && 'animate-spin')}
        style={
          isRefreshing ? undefined : { transform: `rotate(${pullProgress * 270}deg)` }
        }
        aria-hidden="true"
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CuttingOrdersPage() {
  const { data: workOrders, isLoading, isError, refetch, isFetching } =
    useCuttingOrdersForKiosk()

  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: refetch,
  })

  return (
    /*
     * The container div must NOT be overflow-y-auto because the kiosk layout's
     * <main> is already the scrollable ancestor (overflow-y-auto, flex-1).
     * usePullToRefresh reads scrollTop on this div; since <main> does the
     * scrolling, we use a sentinel: scrollTop is only 0 when the user is at
     * the very top, which is the correct trigger condition.
     *
     * pb-4 is enough here — the kiosk layout <main> already has pb-20 for
     * the fixed BottomNav. Adding more would create excessive white space.
     */
    <div
      ref={containerRef}
      className="min-h-full"
    >
      <div className="space-y-4 p-4 pb-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Lệnh cắt hôm nay</h1>

          {/* Background-refetch indicator (30 s auto-refresh, not a full pull) */}
          {isFetching && !isLoading && !isRefreshing && (
            <Loader2
              className="size-4 animate-spin text-muted-foreground"
              aria-label="Đang cập nhật…"
            />
          )}
        </div>

        {/* Pull-to-refresh spinner */}
        <PullIndicator isRefreshing={isRefreshing} pullProgress={pullProgress} />

        {/* Content states */}
        {isLoading ? (
          // First-load skeleton: exactly 3 cards as per DoD
          Array.from({ length: 3 }).map((_, i) => (
            <CuttingOrderSkeleton key={i} />
          ))
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Không thể tải lệnh cắt. Kiểm tra kết nối mạng và thử lại.
          </div>
        ) : !workOrders || workOrders.length === 0 ? (
          <EmptyState />
        ) : (
          workOrders.map((wo) => (
            <CuttingOrderCard key={wo.id} order={wo} />
          ))
        )}
      </div>
    </div>
  )
}
