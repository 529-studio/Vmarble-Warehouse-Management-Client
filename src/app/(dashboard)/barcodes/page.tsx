'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Printer, QrCode, RotateCcw, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataPagination } from '@/components/ui/data-pagination'
import {
  useBarcodesForWorkOrder,
  useBarcodeScansBatch,
  useBatchPrintBarcodeLabels,
  useOpenBarcodeLabelPdf,
  pickLatestScan,
} from '@/lib/hooks/use-barcode'
import { useWorkOrders } from '@/lib/hooks/use-work-orders'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { BarcodeRecord, ScanCheckpoint, ScanEvent, WorkOrder } from '@/types/api'

const CHECKPOINT_LABEL: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'Hoàn thành CNC',
  FINISHED_GOODS: 'Hoàn thành gia công',
  SHIPPED: 'Xuất kho',
}

const CHECKPOINT_COLOR: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'bg-orange-100 text-orange-700 border-orange-200',
  FINISHED_GOODS: 'bg-blue-100 text-blue-700 border-blue-200',
  SHIPPED: 'bg-green-100 text-green-700 border-green-200',
}

// Sentinel value for the "latest scan = none" filter — Radix Select rejects
// empty-string values, so we use a non-checkpoint string and translate before
// hitting the URL.
const FILTER_PENDING = 'PENDING'
const FILTER_ALL = 'ALL'

const PAGE_SIZE = 20
const DEFAULT_RANGE_DAYS = 30

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToday(): string {
  return isoDate(new Date())
}

function defaultFromIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - DEFAULT_RANGE_DAYS)
  return isoDate(d)
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function workOrderLabel(wo: WorkOrder) {
  const sku = wo.sku_code ?? '—'
  return `${shortId(wo.id)} · ${sku} (×${wo.quantity})`
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  workOrderId: string
  onWorkOrderChange: (id: string) => void
  workOrders: WorkOrder[]
  workOrdersLoading: boolean
  checkpoint: string
  onCheckpointChange: (v: string) => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  isDefaultRange: boolean
  onResetRange: () => void
  hasFilters: boolean
  onReset: () => void
}

function FilterBar({
  search, onSearch,
  workOrderId, onWorkOrderChange, workOrders, workOrdersLoading,
  checkpoint, onCheckpointChange,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
  isDefaultRange, onResetRange,
  hasFilters, onReset,
}: FilterBarProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Lệnh sản xuất</label>
          <Select value={workOrderId || FILTER_ALL} onValueChange={(v) => onWorkOrderChange(v === FILTER_ALL ? '' : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={workOrdersLoading ? 'Đang tải…' : 'Chọn lệnh sản xuất'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Tất cả lệnh</SelectItem>
              {workOrders.map((wo) => (
                <SelectItem key={wo.id} value={wo.id}>{workOrderLabel(wo)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Tìm kiếm</label>
          <SearchInput
            placeholder="Mã barcode, SKU, kích thước…"
            value={search}
            onChange={onSearch}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Trạng thái checkpoint</label>
          <Select value={checkpoint || FILTER_ALL} onValueChange={(v) => onCheckpointChange(v === FILTER_ALL ? '' : v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Tất cả</SelectItem>
              <SelectItem value={FILTER_PENDING}>Chưa quét</SelectItem>
              <SelectItem value="CNC_COMPLETE">Hoàn thành CNC</SelectItem>
              <SelectItem value="FINISHED_GOODS">Hoàn thành gia công</SelectItem>
              <SelectItem value="SHIPPED">Xuất kho</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Ngày sản xuất {isDefaultRange && <span className="text-muted-foreground/70">(30 ngày gần nhất)</span>}
            </label>
            <button
              type="button"
              onClick={onResetRange}
              disabled={isDefaultRange}
              title={isDefaultRange ? 'Đang ở mặc định 30 ngày gần nhất' : 'Đặt lại 30 ngày gần nhất'}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="size-3" /> 30 ngày
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={dateFrom} max={dateTo || undefined} aria-label="Từ ngày" onChange={(e) => onDateFromChange(e.target.value)} />
            <Input type="date" value={dateTo} min={dateFrom || undefined} aria-label="Đến ngày" onChange={(e) => onDateToChange(e.target.value)} />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="size-4" /> Xoá bộ lọc
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Row + helpers ─────────────────────────────────────────────────────────────

interface BarcodeRow {
  barcode: BarcodeRecord
  latest: ScanEvent | null
}

function CheckpointBadge({ event }: { event: ScanEvent | null }) {
  if (!event) {
    return <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Chưa quét</Badge>
  }
  return (
    <Badge variant="outline" className={CHECKPOINT_COLOR[event.checkpoint]}>
      {CHECKPOINT_LABEL[event.checkpoint]}
    </Badge>
  )
}

// ── Page content ──────────────────────────────────────────────────────────────

function BarcodesContent() {
  const params = usePageParams(PAGE_SIZE)
  const debouncedSearch = useDebounce(params.search, 300)

  const workOrderId = params.getParam('wo') ?? ''
  const checkpointFilter = params.getParam('cp') ?? ''
  const today = isoToday()
  const defaultFrom = useMemo(() => defaultFromIso(), [])
  const dateFrom = params.getParam('from') ?? defaultFrom
  const dateTo = params.getParam('to') ?? today
  const isDefaultRange = dateFrom === defaultFrom && dateTo === today

  // Fan in: pull recent WOs (any status) so the user can scan their list.
  // We don't have a "list all barcodes" endpoint, so the user must pick a WO.
  const { data: woData, isLoading: woLoading } = useWorkOrders({ limit: 100 })
  const workOrders = useMemo(() => woData?.items ?? [], [woData?.items])

  const { data: barcodes, isLoading: bcLoading, isError: bcError } = useBarcodesForWorkOrder(workOrderId)

  const allBarcodes = useMemo(() => barcodes ?? [], [barcodes])
  const barcodeIds = useMemo(() => allBarcodes.map((b) => b.id), [allBarcodes])

  const scanResults = useBarcodeScansBatch(barcodeIds)
  const scansLoading = scanResults.some((q) => q.isLoading)

  const rows = useMemo<BarcodeRow[]>(() => {
    return allBarcodes.map((b, i) => ({
      barcode: b,
      latest: pickLatestScan(scanResults[i]?.data),
    }))
  }, [allBarcodes, scanResults])

  // Defensive client-side filtering — keeps the UI responsive even if BE adds
  // these filters server-side later.
  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null
    // Inclusive upper bound: end of day in local time.
    const toTs = dateTo ? new Date(dateTo).getTime() + 86_399_999 : null

    return rows.filter(({ barcode, latest }) => {
      if (q) {
        const haystack = `${barcode.id} ${barcode.sku_code} ${barcode.sku_name} ${barcode.dimensions}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (checkpointFilter === FILTER_PENDING) {
        if (latest) return false
      } else if (checkpointFilter) {
        if (latest?.checkpoint !== checkpointFilter) return false
      }
      if (fromTs !== null || toTs !== null) {
        const produced = new Date(barcode.produced_date).getTime()
        if (fromTs !== null && produced < fromTs) return false
        if (toTs !== null && produced > toTs) return false
      }
      return true
    })
  }, [rows, debouncedSearch, checkpointFilter, dateFrom, dateTo])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / params.limit))
  const currentPage = Math.min(params.page, totalPages)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * params.limit
    return filteredRows.slice(start, start + params.limit)
  }, [filteredRows, currentPage, params.limit])

  // Multi-select state — only IDs that exist on the *current* page count toward
  // "select page" so the header checkbox tracks what the user can actually see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const pageIds = paged.map((r) => r.barcode.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const hasFilters = !!(workOrderId || debouncedSearch || checkpointFilter || !isDefaultRange)

  const resetFilters = () => {
    params.setParams({ wo: undefined, cp: undefined, from: undefined, to: undefined, search: undefined })
    clearSelection()
  }

  const resetRange = () => {
    params.setParams({ from: undefined, to: undefined })
  }

  // ── Print actions ────────────────────────────────────────────────────────
  const openSinglePdf = useOpenBarcodeLabelPdf()
  const batchPrint = useBatchPrintBarcodeLabels()

  const handlePrintOne = async (id: string) => {
    try {
      const url = await openSinglePdf.mutateAsync(id)
      window.open(url, '_blank', 'noopener,noreferrer')
      // Revoke after the new tab has had time to load — 30s is generous.
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'In nhãn thất bại')
    }
  }

  const handleBatchPrint = async () => {
    if (selectedIds.size === 0) return
    try {
      const url = await batchPrint.mutateAsync({ barcode_ids: Array.from(selectedIds) })
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      toast.success(`Đã chuẩn bị PDF cho ${selectedIds.size} barcode`)
    } catch {
      // toast handled by mutation
    }
  }

  return (
    <div className="space-y-4">
      <FilterBar
        search={params.search}
        onSearch={params.setSearch}
        workOrderId={workOrderId}
        onWorkOrderChange={(v) => { params.setParam('wo', v || undefined); clearSelection() }}
        workOrders={workOrders}
        workOrdersLoading={woLoading}
        checkpoint={checkpointFilter}
        onCheckpointChange={(v) => params.setParam('cp', v || undefined)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(v) => params.setParam('from', v || undefined)}
        onDateToChange={(v) => params.setParam('to', v || undefined)}
        isDefaultRange={isDefaultRange}
        onResetRange={resetRange}
        hasFilters={hasFilters}
        onReset={resetFilters}
      />

      {/* Empty WO selection — guidance, not an error */}
      {!workOrderId && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <QrCode className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Chọn một lệnh sản xuất để xem barcode</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hệ thống hiển thị barcode theo từng lệnh. Hãy chọn lệnh cần quản lý ở bộ lọc trên.
          </p>
        </div>
      )}

      {/* WO selected — show table */}
      {workOrderId && (
        <>
          {/* Selection toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
              <p className="text-sm">Đã chọn <span className="font-semibold">{selectedIds.size}</span> barcode</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Bỏ chọn
                </Button>
                <Button size="sm" onClick={handleBatchPrint} disabled={batchPrint.isPending}>
                  {batchPrint.isPending ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                  In hàng loạt ({selectedIds.size})
                </Button>
              </div>
            </div>
          )}

          {bcLoading ? (
            <div className="rounded-xl border bg-card p-4">
              <Skeleton className="mb-3 h-6 w-40" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : bcError ? (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
              Không thể tải danh sách barcode.
            </p>
          ) : totalItems === 0 ? (
            <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
              {allBarcodes.length === 0
                ? 'Lệnh này chưa có barcode nào. Tạo barcode từ trang chi tiết lệnh sản xuất.'
                : 'Không có barcode nào khớp bộ lọc hiện tại.'}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả trên trang"
                        className="size-4 cursor-pointer accent-primary"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected }}
                        onChange={togglePage}
                      />
                    </TableHead>
                    <TableHead>Mã barcode</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kích thước</TableHead>
                    <TableHead>Ngày sản xuất</TableHead>
                    <TableHead>Checkpoint</TableHead>
                    <TableHead>Quét gần nhất</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(({ barcode, latest }) => {
                    const checked = selectedIds.has(barcode.id)
                    return (
                      <TableRow key={barcode.id} className={checked ? 'bg-muted/30' : ''}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Chọn barcode ${shortId(barcode.id)}`}
                            className="size-4 cursor-pointer accent-primary"
                            checked={checked}
                            onChange={() => toggleOne(barcode.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/barcodes/${barcode.id}/scans`}
                            className="font-mono text-sm font-medium text-primary hover:underline"
                          >
                            {shortId(barcode.id)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{barcode.sku_code}</p>
                          <p className="text-xs text-muted-foreground">{barcode.sku_name}</p>
                        </TableCell>
                        <TableCell className="text-sm">{barcode.dimensions}</TableCell>
                        <TableCell className="text-sm">{formatDate(barcode.produced_date)}</TableCell>
                        <TableCell>
                          {scansLoading ? (
                            <Skeleton className="h-5 w-24" />
                          ) : (
                            <CheckpointBadge event={latest} />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {latest ? formatDateTime(latest.scanned_at) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintOne(barcode.id)}
                            disabled={openSinglePdf.isPending}
                          >
                            <Printer className="size-4" /> In
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="border-t p-3">
                <DataPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  limit={params.limit}
                  onPageChange={params.setPage}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function BarcodesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <QrCode className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Quản lý barcode</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <BarcodesContent />
      </Suspense>
    </div>
  )
}
