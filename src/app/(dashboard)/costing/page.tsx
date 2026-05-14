'use client'

import { Suspense, useEffect, useMemo, useSyncExternalStore, useState } from 'react'
import { toast } from 'sonner'
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

  const { page, search, limit, setPage, setSearch } = usePageParams(10)

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

  const [finalizedFilter, setFinalizedFilter] = useState<FinalizedFilter>('ALL')
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
  })

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

  const records = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={inputValue}
          onChange={(v) => {
            setInputValue(v)
          }}
          isPending={isPending}
          placeholder="Tìm theo WO ID, SKU ID…"
          containerClassName="w-full sm:max-w-sm"
        />

        <Select
          value={finalizedFilter}
          onValueChange={(v) => {
            setFinalizedFilter(v as FinalizedFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
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

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải dữ liệu giá thành.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Đang tải…' : `Tất cả bản ghi (${totalItems})`}
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
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {debouncedSearch
                        ? `Không tìm thấy kết quả cho "${debouncedSearch}"`
                        : 'Chưa có bản ghi giá thành nào.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => {
                    const rowComputing = computePending && computingWorkOrderId === r.work_order_id
                    const rowFinalizing = finalizePending && finalizingWorkOrderId === r.work_order_id
                    const lockByFinalized = r.finalized

                    return (
                      <TableRow
                        key={r.id}
                        className={isFetching ? 'opacity-60 transition-opacity' : ''}
                      >
                        <TableCell className="font-mono text-xs">
                          {r.work_order_id.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {r.sku_id.slice(0, 8)}…
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
