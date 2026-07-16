'use client'

import { useState } from 'react'
import { CalendarIcon, RotateCcw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

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
  /** Days back the reset button restores. Defaults to 30. */
  defaultDaysAgo?: number
  /** Inline label to the left of the trigger button. */
  label?: string
  className?: string
  /**
   * When provided, replaces the reset button with a "Xoá" button that calls
   * this handler. Useful for optional date ranges with no meaningful default.
   */
  onClear?: () => void
}

/**
 * Date-range picker using shadcn Calendar + Popover.
 * Purely controlled — URL sync and React Query refetch are the caller's responsibility.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  defaultDaysAgo = DEFAULT_RANGE_DAYS,
  label,
  className,
  onClear,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)

  const today = isoToday()
  const defaultFrom = defaultFromIso(defaultDaysAgo)
  const isAtDefault = from === defaultFrom && to === today

  const range: DateRange = {
    from: from ? parseISO(from) : undefined,
    to: to ? parseISO(to) : undefined,
  }

  function handleSelect(next: DateRange | undefined) {
    if (!next) return
    const newFrom = next.from ? isoDate(next.from) : from
    const newTo = next.to ? isoDate(next.to) : to
    onChange({ from: newFrom, to: newTo })
    // Close when both ends are selected
    if (next.from && next.to) setOpen(false)
  }

  const displayLabel =
    from && to
      ? `${format(parseISO(from), 'dd/MM/yyyy', { locale: vi })} – ${format(parseISO(to), 'dd/MM/yyyy', { locale: vi })}`
      : 'Chọn khoảng ngày'

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 gap-2 px-3 text-sm font-normal',
              !from && !to && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
      {!isAtDefault && !onClear && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => onChange({ from: defaultFrom, to: today })}
        >
          <RotateCcw className="size-3" />
          {defaultDaysAgo} ngày
        </Button>
      )}
      {onClear && (from || to) && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={onClear}
        >
          <RotateCcw className="size-3" />
          Xoá
        </Button>
      )}
    </div>
  )
}
