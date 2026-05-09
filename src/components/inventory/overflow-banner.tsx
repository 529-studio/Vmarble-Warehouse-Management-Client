'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverflowStatus } from '@/lib/hooks/use-inventory'

/**
 * Sticky red banner shown across kiosk + dashboard layouts when remnant
 * inventory exceeds the overflow threshold (BR-K05). The banner forces the
 * shop floor to consume remnants before issuing a new whole sheet.
 *
 * Renders nothing when status is GREEN/YELLOW or while the query is pending.
 */
export function OverflowBanner({ className }: { className?: string }) {
  const { data } = useOverflowStatus()
  if (!data || !data.block_new_sheet_issue) return null

  const pct = Number.isFinite(data.overflow_pct) ? data.overflow_pct.toFixed(1) : '—'
  const threshold = Number.isFinite(data.threshold_pct) ? data.threshold_pct.toFixed(0) : '15'

  return (
    <div
      role="alert"
      className={cn(
        'sticky top-0 z-30 flex items-start gap-3 border-b border-red-300 bg-red-50 px-4 py-3 text-red-900 shadow-sm dark:border-red-800 dark:bg-red-950 dark:text-red-100',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="text-sm leading-snug">
        <p className="font-semibold">
          Kho tấm lẻ vượt {threshold}% — phải tiêu thụ trước khi xuất tấm mới
        </p>
        <p className="text-xs opacity-90">
          Tỷ lệ hiện tại: {pct}%. Nút &ldquo;Xuất tấm mới&rdquo; / &ldquo;Cấp tấm cho lệnh cắt&rdquo; tạm khoá. Quản trị viên có thể ghi đè kèm lý do.
        </p>
      </div>
    </div>
  )
}
