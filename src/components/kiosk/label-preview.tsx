import { cn } from '@/lib/utils'
import type { BarcodeRecord } from '@/types/api'

interface LabelPreviewProps {
  barcode: BarcodeRecord
  size?: 'small' | 'large'
  className?: string
}

/**
 * Print-preview for a barcode label.
 * "small" = 50×30mm (remnant), "large" = 100×70mm (WIP).
 * Clicking the label triggers window.print() for browser print dialog.
 */
export function LabelPreview({
  barcode,
  size = 'small',
  className,
}: LabelPreviewProps) {
  const isSmall = size === 'small'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => window.print()}
      onKeyDown={(e) => e.key === 'Enter' && window.print()}
      className={cn(
        'flex cursor-pointer flex-col justify-between rounded-md border-2 border-dashed border-gray-300 bg-white p-3 font-mono text-xs shadow-sm transition hover:border-primary',
        isSmall ? 'h-[114px] w-[189px]' : 'h-[265px] w-[378px]',
        className,
      )}
    >
      {/* Top row: SKU code + ID tail */}
      <div className="flex items-start justify-between">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          {barcode.sku_code}
        </span>
        <span className="text-[10px] text-gray-500">{barcode.id.slice(-6)}</span>
      </div>

      {/* SKU name */}
      <p className="mt-1 truncate font-semibold">{barcode.sku_name}</p>

      {/* Dimensions (free-text from backend) */}
      <p className="text-gray-600">{barcode.dimensions}</p>

      {/* Produced date */}
      <div className="flex justify-between text-gray-500">
        <span>
          Ngày SX:{' '}
          {barcode.produced_date
            ? new Date(barcode.produced_date).toLocaleDateString('vi-VN')
            : '—'}
        </span>
      </div>

      <p className="mt-1 text-center text-[9px] text-gray-400">Nhấn để in</p>
    </div>
  )
}
