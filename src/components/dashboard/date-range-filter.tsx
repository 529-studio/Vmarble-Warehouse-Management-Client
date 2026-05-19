'use client'

import { Calendar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_RANGE_DAYS = 30

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isoToday(): string {
  return isoDate(new Date())
}

export function defaultFromIso(daysAgo = DEFAULT_RANGE_DAYS): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return isoDate(d)
}

interface DateRangeFilterProps {
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
  /** Days back the "reset" button restores. Defaults to 30. */
  defaultDaysAgo?: number
  /** Inline label to the left of the inputs (visually optional). */
  label?: string
  className?: string
}

/**
 * Two-input date range picker with cross-validated min/max and a "30 ngày
 * gần nhất" reset button. The component is purely controlled — URL sync,
 * defaults, and React Query refetch are the caller's responsibility.
 *
 * Used wherever a list page needs server-side `?from=&to=` filtering.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  defaultDaysAgo = DEFAULT_RANGE_DAYS,
  label,
  className,
}: DateRangeFilterProps) {
  const today = isoToday()
  const defaultFrom = defaultFromIso(defaultDaysAgo)
  const isAtDefault = from === defaultFrom && to === today

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ''}`}>
      {label ? (
        <span className="text-xs text-muted-foreground">{label}</span>
      ) : (
        <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <input
        type="date"
        value={from}
        max={to}
        aria-label="Từ ngày"
        onChange={(e) => onChange({ from: e.target.value || defaultFrom, to })}
        className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        –
      </span>
      <input
        type="date"
        value={to}
        min={from}
        max={today}
        aria-label="Đến ngày"
        onChange={(e) => onChange({ from, to: e.target.value || today })}
        className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!isAtDefault && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onChange({ from: defaultFrom, to: today })}
        >
          <RotateCcw className="size-3" />
          {defaultDaysAgo} ngày
        </Button>
      )}
    </div>
  )
}
