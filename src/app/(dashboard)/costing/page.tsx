'use client'

import { Suspense, useEffect, useMemo, useSyncExternalStore, useState } from 'react'
import { toast } from 'sonner'
import { Calendar, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchInput } from '@/components/ui/search-input'
import { DataPagination } from '@/components/ui/data-pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useComputeCosting, useCosting, useFinalizeCosting } from '@/lib/hooks/use-costing'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { useSKUs } from '@/lib/hooks/use-skus'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { formatVND } from '@/lib/format'
import type { CostingRecord } from '@/types/api'

const fmt = formatVND

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

type FinalizedFilter = 'ALL' | 'FINALIZED' | 'DRAFT'

const FINALIZED_LABELS: Record<FinalizedFilter, string> = {
  ALL: 'Tất cả',
  FINALIZED: 'Đã chốt',
  DRAFT: 'Nháp',
}

const ALL_SKUS = '__all__'

function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeDisabledReason(
  canCompute: boolean,
  locked: boolean,
  computing: boolean,
  finalizing: boolean,
): string | null {
  if (!canCompute) return 'Không đủ quyền tính giá thành.'
  if (locked) return 'Giá thành đã chốt, không thể tính lại.'
  if (computing) return 'Đang tính giá thành cho lệnh khác.'
  if (finalizing) return 'Đang chốt giá thành cho lệnh khác.'
  return null
}

function finalizeDisabledReason(
  canFinalize: boolean,
  locked: boolean,
  computing: boolean,
  finalizing: boolean,
): string | null {
  if (!canFinalize) return 'Không đủ quyền chốt giá thành.'
  if (locked) return 'Giá thành đã chốt trước đó.'
  if (computing) return 'Đang tính lại — chờ xong rồi chốt.'
  if (finalizing) return 'Đang chốt giá thành cho lệnh khác.'
  return null
}

function adjustDisabledReason(canAdjust: boolean, finalized: boolean): string | null {
  if (!canAdjust) return 'Không đủ quyền điều chỉnh giá thành (chỉ kế toán / admin).'
  if (!finalized) return 'Chỉ điều chỉnh được sau khi đã chốt giá thành.'
  return null
}

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function AdjustmentDialog({
  open,
  record,
  onClose,
}: {
  open: boolean
  record: CostingRecord | null
  onClose: () => void
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setReason(''))
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return

    toast.error('Backend chưa hỗ trợ API Costing Adjustment trên môi trường hiện tại.')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo điều chỉnh giá thành</DialogTitle>
        </DialogHeader>

        {!record ? null : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">WO:</span>{' '}
                <span className="font-mono">{record.work_order_id.slice(0, 8).toUpperCase()}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Tổng hiện tại:</span>{' '}
                <span className="font-semibold">{fmt(record.total_cost.amount)}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjustment-reason">Lý do điều chỉnh</Label>
              <Input
                id="adjustment-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do bắt buộc"
                required
              />
            </div>

            <p className="rounded border border-dashed px-3 py-2 text-xs text-muted-foreground">
              Lịch sử điều chỉnh sẽ hiển thị tại đây sau khi backend cung cấp API adjustments.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={!reason.trim()}>
                Lưu điều chỉnh
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CostingContent() {
  const role = useCurrentRole()
  const canComputeCosting = can(role, 'compute', 'costing')
  const canFinalizeCosting = can(role, 'finalize', 'costing')
  const canAdjustCosting = can(role, 'adjust', 'costing')
  const canWriteCosting = canComputeCosting || canFinalizeCosting || canAdjustCosting

  const { page, search, limit, getParam, setPage, setSearch, setParam, setParams } =
    usePageParams(10)

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)

  const normalizedSearch = useMemo(
    () => debouncedSearch.trim() || undefined,
    [debouncedSearch],
  )

  useEffect(() => {
    if (search === debouncedSearch) return
    setSearch(debouncedSearch)
  }, [debouncedSearch, search, setSearch])

  // URL-driven filters mirror /work-orders so accountants can deep-link reports
  // (#190 DoD §3). 'finalized', 'sku_id', 'from', 'to' all live in the query
  // string; defaults are blank (no constraint) rather than today's date so the
  // costing page surfaces all historical records by default.
  const finalizedFilter = (getParam('finalized') ?? 'ALL') as FinalizedFilter
  const skuFilter = getParam('sku_id') ?? ALL_SKUS
  const dateFrom = getParam('from') ?? ''
  const dateTo = getParam('to') ?? ''
  const today = isoToday()
  const hasDateFilter = !!(dateFrom || dateTo)
  const hasAnyFilter =
    !!normalizedSearch || finalizedFilter !== 'ALL' || skuFilter !== ALL_SKUS || hasDateFilter

  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentRecord, setAdjustmentRecord] = useState<CostingRecord | null>(null)

  const [computingWorkOrderId, setComputingWorkOrderId] = useState<string | null>(null)
  const [finalizingWorkOrderId, setFinalizingWorkOrderId] = useState<string | null>(null)

  const { data, isLoading, isFetching, isError } = useCosting({
    page,
    limit,
    search: normalizedSearch,
    finalized:
      finalizedFilter === 'ALL' ? undefined : finalizedFilter === 'FINALIZED',
    sku_id: skuFilter !== ALL_SKUS ? skuFilter : undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  })

  // SKU lookup — used both for the dropdown and to render readable names in
  // the table once #190 lands.
  const { data: skusData } = useSKUs({ limit: 200 })
  const skus = useMemo(() => skusData?.items ?? [], [skusData?.items])
  const skuLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const sku of skus) {
      const code = sku.code ?? sku.id.slice(0, 8)
      const name = sku.name ?? ''
      map.set(sku.id, name ? `${code} — ${name}` : code)
    }
    return map
  }, [skus])

  const { mutate: computeCosting, isPending: computePending } = useComputeCosting()
  const { mutate: finalizeCosting, isPending: finalizePending } = useFinalizeCosting()

  function handleCompute(workOrderId: string) {
    setComputingWorkOrderId(workOrderId)
    computeCosting(workOrderId, {
      onSettled: () => {
        setComputingWorkOrderId((prev) => (prev === workOrderId ? null : prev))
      },
    })
  }

  function handleFinalize(workOrderId: string) {
    setFinalizingWorkOrderId(workOrderId)
    finalizeCosting(workOrderId, {
      onSettled: () => {
        setFinalizingWorkOrderId((prev) => (prev === workOrderId ? null : prev))
      },
    })
  }

  function openAdjustment(record: CostingRecord) {
    setAdjustmentRecord(record)
    setAdjustmentOpen(true)
  }

  const isPending = isFetching && inputValue !== debouncedSearch

  // Defensive client-side filter: if BE silently drops sku_id/from/to params
  // (#190 says these may not be wired yet), the toolbar still narrows the
  // visible page so the user trusts what they see. Mirrors the same fallback
  // we use on /cutting-dispatch for `assigned`.
  const filteredRecords = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((r) => {
      if (skuFilter !== ALL_SKUS && r.sku_id !== skuFilter) return false
      if (dateFrom) {
        const created = (r.created_at ?? '').slice(0, 10)
        if (created < dateFrom) return false
      }
      if (dateTo) {
        const created = (r.created_at ?? '').slice(0, 10)
        if (created > dateTo) return false
      }
      return true
    })
  }, [data?.items, skuFilter, dateFrom, dateTo])
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  function clearAllFilters() {
    setInputValue('')
    setParams({
      search: undefined,
      finalized: undefined,
      sku_id: undefined,
      from: undefined,
      to: undefined,
    })
  }

  return (
    <>
      <AdjustmentDialog
        open={adjustmentOpen}
        record={adjustmentRecord}
        onClose={() => setAdjustmentOpen(false)}
      />

      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Màn hình đã hỗ trợ workflow Compute → Finalize. API Costing Adjustment chưa có trên backend dev nên tạm thời hiển thị form và validate lý do.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-60">
          <Label className="text-xs text-muted-foreground">Tìm WO / SKU</Label>
          <SearchInput
            value={inputValue}
            onChange={(v) => setInputValue(v)}
            isPending={isPending}
            placeholder="Tìm theo WO ID, SKU ID…"
            containerClassName="mt-1 w-full max-w-sm"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Trạng thái</Label>
          <Select
            value={finalizedFilter}
            onValueChange={(v) => setParam('finalized', v === 'ALL' ? undefined : v)}
          >
            <SelectTrigger className="mt-1 w-44">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FINALIZED_LABELS) as FinalizedFilter[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {FINALIZED_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Sản phẩm</Label>
          <Select
            value={skuFilter}
            onValueChange={(v) => setParam('sku_id', v === ALL_SKUS ? undefined : v)}
          >
            <SelectTrigger className="mt-1 w-56">
              <SelectValue placeholder="Tất cả SKU" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SKUS}>Tất cả SKU</SelectItem>
              {skus.map((sku) => (
                <SelectItem key={sku.id} value={sku.id}>
                  {sku.code ?? sku.id.slice(0, 8)}
                  {sku.name ? ` — ${sku.name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo || today}
              aria-label="Từ ngày"
              onChange={(e) => {
                const val = e.target.value
                setParams({ from: val || undefined, to: dateTo || undefined })
              }}
              className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground text-sm" aria-hidden="true">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={today}
              aria-label="Đến ngày"
              onChange={(e) => {
                const val = e.target.value
                setParams({ from: dateFrom || undefined, to: val || undefined })
              }}
              className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {hasAnyFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1"
          >
            <X className="size-3" />
            Xoá bộ lọc
          </Button>
        )}
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải dữ liệu giá thành.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading
                ? 'Đang tải…'
                : hasAnyFilter
                  ? `Kết quả lọc (${filteredRecords.length}${filteredRecords.length !== totalItems ? ` / ${totalItems}` : ''})`
                  : `Tất cả bản ghi (${totalItems})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Lệnh sản xuất</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">CP vật liệu</TableHead>
                  <TableHead className="text-right">CP phụ trợ</TableHead>
                  <TableHead className="text-right">CP nhân công</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={limit} />
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {hasAnyFilter
                        ? 'Không tìm thấy bản ghi nào khớp bộ lọc hiện tại.'
                        : 'Chưa có bản ghi giá thành nào.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((r) => {
                    const rowComputing = computePending && computingWorkOrderId === r.work_order_id
                    const rowFinalizing = finalizePending && finalizingWorkOrderId === r.work_order_id
                    const lockByFinalized = r.finalized
                    const skuLabel = skuLabelById.get(r.sku_id)

                    return (
                      <TableRow
                        key={r.id}
                        className={isFetching ? 'opacity-60 transition-opacity' : ''}
                      >
                        <TableCell className="font-mono text-xs">
                          {r.work_order_id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="text-xs">
                          {skuLabel ? (
                            <span className="font-medium">{skuLabel}</span>
                          ) : (
                            <span className="font-mono text-muted-foreground">{r.sku_id.slice(0, 8)}…</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmt(r.material_cost.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt(r.auxiliary_cost.amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {fmt(r.labor_cost.amount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {fmt(r.total_cost.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.finalized ? 'default' : 'outline'}>
                            {r.finalized ? 'Đã chốt' : 'Nháp'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(r.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!canWriteCosting ? (
                            <span className="text-xs text-muted-foreground">Bạn chỉ có quyền xem bảng giá thành.</span>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                title={computeDisabledReason(canComputeCosting, lockByFinalized, rowComputing, rowFinalizing) ?? undefined}
                                disabled={
                                  !canComputeCosting
                                  || lockByFinalized
                                  || rowComputing
                                  || rowFinalizing
                                }
                                onClick={() => handleCompute(r.work_order_id)}
                              >
                                {rowComputing ? 'Đang tính...' : 'Tính lại giá'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                title={finalizeDisabledReason(canFinalizeCosting, lockByFinalized, rowComputing, rowFinalizing) ?? undefined}
                                disabled={
                                  !canFinalizeCosting
                                  || lockByFinalized
                                  || rowComputing
                                  || rowFinalizing
                                }
                                onClick={() => handleFinalize(r.work_order_id)}
                              >
                                {rowFinalizing ? 'Đang chốt...' : 'Chốt giá thành'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                title={adjustDisabledReason(canAdjustCosting, r.finalized) ?? 'Tạo bản điều chỉnh giá thành cho WO này'}
                                disabled={!canAdjustCosting || !r.finalized}
                                onClick={() => openAdjustment(r)}
                              >
                                Điều chỉnh
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </>
  )
}

export default function CostingPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Tính giá thành</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <CostingContent />
      </Suspense>
    </div>
  )
}
