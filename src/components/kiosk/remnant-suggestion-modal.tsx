'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, PackageX } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { BigButton } from '@/components/kiosk/big-button'
import { cn } from '@/lib/utils'
import { useSuggestRemnants, useAllocateRemnant } from '@/lib/hooks/use-remnants'
import { ApiClientError } from '@/lib/api/client'
import type { WorkOrder, RemnantSuggestion } from '@/types/api'

// ── Score badge ───────────────────────────────────────────────────────────────

function fitScoreBg(score: number): string {
  if (score >= 0.8) return 'bg-green-500'
  if (score >= 0.6) return 'bg-yellow-500'
  return 'bg-orange-500'
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

export interface SuggestionCardProps {
  suggestion: RemnantSuggestion
  requiredDimensions: { length_mm: number; width_mm: number }
  /** True when THIS card's remnant is being allocated. */
  isAllocating: boolean
  /** True when ANY allocation is in flight — disables all non-selected cards. */
  isAnyAllocating: boolean
  onSelect: () => void
}

export function SuggestionCard({ suggestion, requiredDimensions, isAllocating, isAnyAllocating, onSelect }: SuggestionCardProps) {
  const { remnant, location } = suggestion
  const { length_mm, width_mm } = remnant.dimensions

  // Compute fit score and waste percentage client-side from the remnant dimensions
  const rl = remnant.bounding_box_length_mm ?? length_mm
  const rw = remnant.bounding_box_width_mm ?? width_mm
  const remnantArea = rl * rw
  const requiredArea = requiredDimensions.length_mm * requiredDimensions.width_mm
  const fitScore = remnantArea > 0 ? Math.min(1, requiredArea / remnantArea) : 0
  const wasteAreaMm2 = Math.max(0, remnantArea - requiredArea)
  const wastePct = remnantArea > 0 ? (wasteAreaMm2 / remnantArea) * 100 : 0
  const pct = Math.round(fitScore * 100)
  const disabled = isAnyAllocating

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'flex w-full min-h-[72px] items-center gap-4 border-b px-4 py-3 text-left last:border-b-0',
        'transition-colors active:bg-muted/60',
        disabled ? 'cursor-wait opacity-50' : 'hover:bg-muted/30',
      )}
    >
      {/* Fit score badge */}
      <div
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
          fitScoreBg(fitScore),
        )}
        aria-label={`Độ khớp ${pct}%`}
      >
        {pct}%
      </div>

      {/* Dimensions + waste */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">
          {length_mm} × {width_mm} mm
        </p>
        <p className="text-sm text-muted-foreground">
          Hao hụt: {wastePct.toFixed(1)}%
        </p>
      </div>

      {/* Shelf location */}
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">Vị trí</p>
        <p className="text-sm font-medium font-mono">
          {location?.barcode ?? '—'}
        </p>
      </div>

      {isAllocating && (
        <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      )}
    </button>
  )
}

// ── Loading skeletons ─────────────────────────────────────────────────────────

function SuggestionSkeletons() {
  return (
    <div className="divide-y">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex min-h-[72px] items-center gap-4 px-4 py-3">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-8 w-14 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ── Empty / no-dimension states ───────────────────────────────────────────────

interface EmptyStateProps {
  message: string
  /** When true, show "Xem kho tấm lẻ →" link so worker can browse manually. */
  showRemnantLink?: boolean
}

function EmptyState({ message, showRemnantLink }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <PackageX className="size-10 text-muted-foreground/40" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {showRemnantLink && (
        <Link
          href="/remnant-list"
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Xem kho tấm lẻ →
        </Link>
      )}
    </div>
  )
}

// ── RemnantSuggestionModal ────────────────────────────────────────────────────

interface RemnantSuggestionModalProps {
  /** The work order to find remnants for. Modal is controlled by parent. */
  workOrder: WorkOrder | null
  open: boolean
  onClose: () => void
}

/**
 * Kiosk modal — shown when a worker starts a cutting order.
 * Fetches top-5 remnant suggestions from backend (Best Fit + FIFO) and lets
 * the worker pick one or skip to use a full board.
 *
 * Tap count to select: 2 (open via card button + tap a suggestion = navigate)
 */
export function RemnantSuggestionModal({
  workOrder,
  open,
  onClose,
}: RemnantSuggestionModalProps) {
  const router = useRouter()
  const [allocatingId, setAllocatingId] = useState<string | null>(null)

  const { mutate: allocate } = useAllocateRemnant()

  const hasDimensions = !!workOrder?.sku_dimensions
  const { data: suggestions, isLoading, isError } = useSuggestRemnants(
    workOrder?.id ?? '',
    workOrder?.sku_dimensions,
  )

  function handleSelect(remnantId: string) {
    if (!workOrder || allocatingId) return
    setAllocatingId(remnantId)
    allocate(
      { remnantId, workOrderId: workOrder.id },
      {
        onSuccess: () => {
          const q = `?wo_id=${workOrder.id}&remnant_id=${remnantId}`
          router.push(`/report-cut${q}`)
          onClose()
        },
        onError: (err) => {
          setAllocatingId(null)
          const msg =
            err instanceof ApiClientError ? err.message : 'Không thể chọn tấm lẻ. Thử lại.'
          toast.error(msg)
        },
      },
    )
  }

  function handleSkip() {
    if (!workOrder) return
    router.push(`/report-cut?wo_id=${workOrder.id}`)
    onClose()
  }

  // Reset allocating state when modal closes
  function handleOpenChange(next: boolean) {
    if (!next) {
      setAllocatingId(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/*
       * Override DialogContent defaults:
       *   grid → flex flex-col   (so header/body/footer stack correctly)
       *   gap-4 → gap-0          (borders between sections handle spacing)
       *   p-6 → p-0              (sections own their own padding)
       * max-h-[85dvh] keeps the modal within the viewport on small phones.
       */}
      <DialogContent className="flex flex-col gap-0 p-0 max-h-[85dvh] sm:max-w-md">
        {/* Header — pr-12 avoids overlap with the shadcn close (×) button */}
        <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left">
          <DialogTitle className="text-lg">Chọn tấm lẻ để cắt</DialogTitle>
          {workOrder?.sku_dimensions && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Cần: {workOrder.sku_dimensions.length_mm} × {workOrder.sku_dimensions.width_mm} mm
            </p>
          )}
        </DialogHeader>

        {/* Suggestions list — scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!hasDimensions ? (
            <EmptyState message="Lệnh cắt này chưa có kích thước. Dùng tấm nguyên." />
          ) : isLoading ? (
            <SuggestionSkeletons />
          ) : isError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-destructive">
                Không thể tải gợi ý tấm lẻ. Dùng tấm nguyên hoặc thử lại.
              </p>
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <EmptyState
              message="Không có tấm lẻ phù hợp kích thước này. Dùng tấm nguyên."
              showRemnantLink
            />
          ) : (
            <div className="divide-y">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.remnant.id}
                  suggestion={s}
                  requiredDimensions={workOrder!.sku_dimensions!}
                  isAllocating={allocatingId === s.remnant.id}
                  isAnyAllocating={!!allocatingId}
                  onSelect={() => handleSelect(s.remnant.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="shrink-0 border-t p-4">
          <BigButton
            variant="secondary"
            onClick={handleSkip}
            disabled={!!allocatingId}
          >
            Dùng tấm nguyên
          </BigButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
