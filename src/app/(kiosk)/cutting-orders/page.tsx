'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CuttingOrderCard } from '@/components/kiosk/cutting-order-card'
import { RemnantSuggestionModal } from '@/components/kiosk/remnant-suggestion-modal'
import { useCuttingOrdersForKiosk, usePlannedUnassignedForKiosk } from '@/lib/hooks/use-cutting-orders'
import { useClaimWorkOrder } from '@/lib/hooks/use-work-orders'
import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/types/api'

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-white px-6 py-12 text-center shadow-sm">
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
        <p className="text-base font-semibold text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">Kéo xuống để làm mới danh sách</p>
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
        style={isRefreshing ? undefined : { transform: `rotate(${pullProgress * 270}deg)` }}
        aria-hidden="true"
      />
    </div>
  )
}

// ── Claim card ────────────────────────────────────────────────────────────────

function ClaimCard({ order }: { order: WorkOrder }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutate: claim, isPending } = useClaimWorkOrder(order.id)

  const skuDisplay = order.sku_code ?? `${order.sku_id.slice(0, 8)}…`
  const skuName = order.sku_name ?? 'Chưa có tên SKU'
  const hasDim = !!order.sku_dimensions

  function handleClaim() {
    claim(undefined, {
      onSuccess: () => {
        toast.success(`Đã nhận lệnh ${skuDisplay}`)
        setConfirmOpen(false)
      },
    })
  }

  return (
    <>
      <article className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-[18px] font-bold leading-tight tracking-tight text-foreground">
              {skuDisplay}
            </p>
            <p className="truncate text-sm font-semibold text-muted-foreground">{skuName}</p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {hasDim && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {order.sku_dimensions!.length_mm} × {order.sku_dimensions!.width_mm} mm
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                SL: {order.quantity}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center',
            'bg-blue-50 px-4 py-3',
            'border-t text-sm font-semibold text-blue-700',
            'transition-colors active:bg-blue-100',
            'disabled:opacity-60',
          )}
        >
          {isPending ? 'Đang nhận…' : 'Nhận việc →'}
        </button>
      </article>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nhận lệnh cắt?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn muốn nhận lệnh <span className="font-semibold">{skuDisplay}</span>
              {order.sku_name ? ` (${order.sku_name})` : ''} không?
              Lệnh sẽ được gán cho bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClaim} disabled={isPending}>
              {isPending ? 'Đang nhận…' : 'Nhận việc'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CuttingOrdersPage() {
  const {
    data: inCuttingOrders,
    isLoading: loadingCutting,
    isError: errorCutting,
    refetch: refetchCutting,
    isFetching: fetchingCutting,
  } = useCuttingOrdersForKiosk()

  const {
    data: plannedOrders,
    isLoading: loadingPlanned,
    isError: errorPlanned,
    refetch: refetchPlanned,
    isFetching: fetchingPlanned,
  } = usePlannedUnassignedForKiosk()

  const [activeTab, setActiveTab] = useState<'cutting' | 'pool'>('cutting')

  const currentRefetch = activeTab === 'cutting' ? refetchCutting : refetchPlanned
  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh({ onRefresh: currentRefetch })

  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)

  const isFetchingBackground =
    activeTab === 'cutting'
      ? fetchingCutting && !loadingCutting && !isRefreshing
      : fetchingPlanned && !loadingPlanned && !isRefreshing

  return (
    <div ref={containerRef} className="min-h-full">
      <div className="space-y-4 p-4 pb-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Lệnh cắt</h1>
          {isFetchingBackground && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Đang cập nhật…" />
          )}
        </div>

        <PullIndicator isRefreshing={isRefreshing} pullProgress={pullProgress} />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cutting' | 'pool')}>
          <TabsList className="w-full">
            <TabsTrigger value="cutting" className="flex-1 text-base min-h-[44px]">
              Đang cắt
              {inCuttingOrders.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                  {inCuttingOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pool" className="flex-1 text-base min-h-[44px]">
              Chờ nhận
              {plannedOrders.length > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                  {plannedOrders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cutting" className="space-y-4 pt-2">
            {loadingCutting ? (
              Array.from({ length: 3 }).map((_, i) => <CuttingOrderSkeleton key={i} />)
            ) : errorCutting ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Không thể tải lệnh cắt. Kiểm tra kết nối mạng và thử lại.
              </div>
            ) : inCuttingOrders.length === 0 ? (
              <EmptyState message="Không có lệnh cắt hôm nay" />
            ) : (
              inCuttingOrders.map((wo) => (
                <CuttingOrderCard key={wo.id} order={wo} onStartCutting={setSelectedWO} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pool" className="space-y-4 pt-2">
            {loadingPlanned ? (
              Array.from({ length: 3 }).map((_, i) => <CuttingOrderSkeleton key={i} />)
            ) : errorPlanned ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Không thể tải danh sách lệnh chờ. Kiểm tra kết nối mạng và thử lại.
              </div>
            ) : plannedOrders.length === 0 ? (
              <EmptyState message="Không có lệnh nào đang chờ nhận" />
            ) : (
              plannedOrders.map((wo) => (
                <ClaimCard key={wo.id} order={wo} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RemnantSuggestionModal
        workOrder={selectedWO}
        open={!!selectedWO}
        onClose={() => setSelectedWO(null)}
      />
    </div>
  )
}
