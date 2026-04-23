'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Package, Search, SlidersHorizontal, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRemnants, useStorageLocations } from '@/lib/hooks/use-remnants'
import type { Remnant, StorageLocation } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ageDays = (createdAt: string) =>
  Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)

// ── Remnant card ──────────────────────────────────────────────────────────────

interface RemnantCardProps {
  remnant: Remnant
  location: StorageLocation | undefined
}

function RemnantCard({ remnant: r, location }: RemnantCardProps) {
  const usableLength = r.bounding_box_length_mm ?? r.dimensions.length_mm
  const usableWidth = r.bounding_box_width_mm ?? r.dimensions.width_mm
  const days = ageDays(r.created_at)
  const isOld = days > 30

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      {/* Row 1: dimensions + status badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold tabular-nums">
            {usableLength} × {usableWidth} mm
          </p>
          {(r.bounding_box_length_mm != null || r.bounding_box_width_mm != null) &&
            (r.bounding_box_length_mm !== r.dimensions.length_mm ||
              r.bounding_box_width_mm !== r.dimensions.width_mm) && (
              <p className="text-sm text-muted-foreground">
                Thực tế: {r.dimensions.length_mm} × {r.dimensions.width_mm} mm
              </p>
            )}
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 bg-green-100 text-sm text-green-700"
        >
          Khả dụng
        </Badge>
      </div>

      {/* Row 2: meta info */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {r.quality_grade && (
          <span>Cấp: <span className="font-medium text-foreground">{r.quality_grade}</span></span>
        )}
        {r.grain_pattern && (
          <span>Vân: <span className="font-medium text-foreground">{r.grain_pattern}</span></span>
        )}
        {r.lot_batch && (
          <span>Lô: <span className="font-mono font-medium text-foreground">{r.lot_batch}</span></span>
        )}
      </div>

      {/* Row 3: location + age */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
          {location ? (
            <span className="font-medium">{location.label}</span>
          ) : (
            <span className="text-muted-foreground italic">Chưa có vị trí kho</span>
          )}
        </div>
        <span className={`text-xs ${isOld ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}>
          {days === 0 ? 'Hôm nay' : `${days} ngày`}
        </span>
      </div>
    </div>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface Filters {
  search: string
  minLength: string
  minWidth: string
  quality: string
}

function FilterBar({
  filters,
  onChange,
  qualityOptions,
  onReset,
  hasActive,
}: {
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  qualityOptions: string[]
  onReset: () => void
  hasActive: boolean
}) {
  const [showDims, setShowDims] = useState(false)

  return (
    <div className="space-y-2">
      {/* Search + toggle row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm lô, nhà cung cấp, ID..."
            className="h-12 pl-9 text-base"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            inputMode="text"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Xóa tìm kiếm"
            >
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          type="button"
          variant={showDims || hasActive ? 'default' : 'outline'}
          size="icon"
          className="size-12 shrink-0"
          onClick={() => setShowDims((p) => !p)}
          aria-label="Bộ lọc"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </div>

      {/* Expandable dimension + quality filters */}
      {showDims && (
        <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Dài tối thiểu (mm)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="h-12 text-base"
                value={filters.minLength}
                onChange={(e) => onChange({ minLength: e.target.value })}
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Rộng tối thiểu (mm)</label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="h-12 text-base"
                value={filters.minWidth}
                onChange={(e) => onChange({ minWidth: e.target.value })}
                min={0}
              />
            </div>
          </div>

          {qualityOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Cấp chất lượng</label>
              <Select
                value={filters.quality}
                onValueChange={(v) => onChange({ quality: v })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Tất cả cấp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả cấp</SelectItem>
                  {qualityOptions.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasActive && (
            <Button
              type="button"
              variant="ghost"
              size="default"
              className="min-h-[48px] w-full text-base text-destructive hover:text-destructive"
              onClick={onReset}
            >
              <X className="mr-1 size-3.5" />
              Xóa bộ lọc
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = { search: '', minLength: '', minWidth: '', quality: 'all' }
const PAGE_SIZE = 50

export function RemnantListClient() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  // Debounced dimension values sent to server — prevents a query per keystroke
  const [serverDims, setServerDims] = useState({ minLength: 0, minWidth: 0 })

  useEffect(() => {
    const id = setTimeout(() => {
      setServerDims({
        minLength: parseInt(filters.minLength, 10) || 0,
        minWidth: parseInt(filters.minWidth, 10) || 0,
      })
    }, 400)
    return () => clearTimeout(id)
  }, [filters.minLength, filters.minWidth])

  const { data, isLoading, isError } = useRemnants({
    status: 'AVAILABLE',
    min_length_mm: serverDims.minLength || undefined,
    min_width_mm: serverDims.minWidth || undefined,
    sort_by: 'created_at',
    order: 'desc',
    limit: PAGE_SIZE,
  })

  const { data: locationMap } = useStorageLocations()

  const allItems = useMemo(() => data?.items ?? [], [data?.items])

  // Derive quality grade options from loaded results
  const qualityOptions = useMemo(
    () =>
      Array.from(
        new Set(allItems.map((r) => r.quality_grade).filter((q): q is string => !!q)),
      ).sort(),
    [allItems],
  )

  // Client-side filters: search + quality grade, then sort newest first.
  // Client-side sort is the source of truth — server sort_by param is a hint
  // only; backend may not honour it for all fields.
  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return allItems
      .filter((r) => {
        if (filters.quality !== 'all' && r.quality_grade !== filters.quality) return false
        if (!q) return true
        return (
          r.id.toLowerCase().includes(q) ||
          (r.lot_batch?.toLowerCase().includes(q) ?? false) ||
          (r.supplier_code?.toLowerCase().includes(q) ?? false) ||
          `${r.dimensions.length_mm}`.includes(q) ||
          `${r.dimensions.width_mm}`.includes(q)
        )
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [allItems, filters.search, filters.quality])

  const hasActiveFilter =
    !!filters.search ||
    !!filters.minLength ||
    !!filters.minWidth ||
    filters.quality !== 'all'

  function handleChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="mt-4 space-y-4 pb-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tồn kho tấm lẻ</h1>
        {data && (
          <span className="text-sm text-muted-foreground">
            {filtered.length}/{data.total_items} tấm
          </span>
        )}
      </div>

      <FilterBar
        filters={filters}
        onChange={handleChange}
        qualityOptions={qualityOptions}
        onReset={handleReset}
        hasActive={hasActiveFilter}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không thể tải dữ liệu. Kiểm tra kết nối mạng.
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
          <Package className="size-10 text-muted-foreground/50" />
          <p className="text-base font-medium">Không có tấm lẻ nào</p>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilter ? 'Thử điều chỉnh bộ lọc' : 'Kho hiện chưa có tấm lẻ khả dụng'}
          </p>
          {hasActiveFilter && (
            <Button variant="ghost" size="default" className="min-h-[48px] text-base" onClick={handleReset}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RemnantCard
              key={r.id}
              remnant={r}
              location={r.bin_location_id ? locationMap?.get(r.bin_location_id) : undefined}
            />
          ))}
          {data && data.total_items > PAGE_SIZE && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Hiển thị {PAGE_SIZE} / {data.total_items} — dùng bộ lọc kích thước để thu hẹp kết quả
            </p>
          )}
        </div>
      )}
    </div>
  )
}
