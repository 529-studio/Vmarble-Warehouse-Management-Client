'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { WorkOrder, MaterialType } from '@/types/api'

// ── Material badge ────────────────────────────────────────────────────────────

const MATERIAL_LABEL: Record<string, string> = {
  PLYWOOD: 'Ván gỗ',
  MDF: 'MDF',
  HDF: 'HDF',
}

function materialLabel(type: MaterialType | undefined): string {
  if (!type) return ''
  return MATERIAL_LABEL[type] ?? type
}

function materialBadgeClass(type: MaterialType | undefined): string {
  if (type === 'PLYWOOD') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (type === 'MDF') return 'bg-sky-100 text-sky-800 border-sky-200'
  if (type === 'HDF') return 'bg-violet-100 text-violet-800 border-violet-200'
  return 'bg-muted text-muted-foreground'
}

// ── CuttingOrderCard ──────────────────────────────────────────────────────────

interface CuttingOrderCardProps {
  order: WorkOrder
  className?: string
  /**
   * When provided, the action button calls this instead of navigating directly
   * to /report-cut. Use to intercept the tap and show the remnant suggestion modal.
   */
  onStartCutting?: (order: WorkOrder) => void
}

/**
 * Mobile-optimised card for a single IN_CUTTING work order.
 *
 * Touch-target height is guaranteed ≥ 48px by the card layout; the
 * "Báo cáo kết quả" button enforces its own min-h-[48px].
 */
export function CuttingOrderCard({ order, className, onStartCutting }: CuttingOrderCardProps) {
  const skuDisplay = order.sku_code ?? `${order.sku_id.slice(0, 8)}\u2026`
  const skuName = order.sku_name ?? 'Chưa có tên SKU'
  const hasDim = !!order.dimensions
  const hasMaterial = !!order.material_type

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white shadow-sm overflow-hidden',
        className,
      )}
    >
      {/* Main info area */}
      <div className="flex items-start gap-3 p-4">
        {/* Left: text content */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* SKU code — prominent, bold, ≥18px */}
          <p className="truncate text-[18px] font-bold leading-tight tracking-tight text-foreground">
            {skuDisplay}
          </p>

          {/* SKU name */}
          <p className="truncate text-sm font-semibold text-muted-foreground">
            {skuName}
          </p>

          {/* Dimensions + quantity row */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {hasDim && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {order.dimensions!.length_mm} × {order.dimensions!.width_mm} mm
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              SL: {order.quantity}
            </span>
          </div>
        </div>

        {/* Right: material badge */}
        {hasMaterial && (
          <Badge
            className={cn(
              'shrink-0 self-start text-xs',
              materialBadgeClass(order.material_type),
            )}
          >
            {materialLabel(order.material_type)}
          </Badge>
        )}
      </div>

      {/* Action button — full-width strip, min-h 48px */}
      {onStartCutting ? (
        <button
          type="button"
          onClick={() => onStartCutting(order)}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center',
            'bg-primary/5 px-4 py-3',
            'border-t text-sm font-semibold text-primary',
            'transition-colors active:bg-primary/10',
          )}
        >
          Bắt đầu cắt →
        </button>
      ) : (
        <Link
          href={`/report-cut?wo_id=${order.id}`}
          className={cn(
            'flex min-h-[48px] w-full items-center justify-center',
            'bg-primary/5 px-4 py-3',
            'border-t text-sm font-semibold text-primary',
            'transition-colors active:bg-primary/10',
          )}
        >
          Báo cáo kết quả →
        </Link>
      )}
    </article>
  )
}
