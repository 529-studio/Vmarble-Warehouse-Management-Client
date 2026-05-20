'use client'

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Calendar, ClipboardList, Plus, RotateCcw, X } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchInput } from '@/components/ui/search-input'
import { DataPagination } from '@/components/ui/data-pagination'
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
import {
  usePlans,
  useCreatePlan,
  useApprovePlan,
  useCancelPlan,
} from '@/lib/hooks/use-plans'
import { usePOs, usePOLineItems } from '@/lib/hooks/use-pos'
import { useSKUs } from '@/lib/hooks/use-skus'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { PlanStatus, ProductionPlan, CreatePlanInput, LineItem } from '@/types/api'

// ── Helpers

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function poSummary(po: { total_skus?: number; total_quantity?: number }): string {
  const parts: string[] = []
  if (po.total_skus != null) parts.push(`${po.total_skus} SKU`)
  if (po.total_quantity != null) parts.push(`${po.total_quantity} sp`)
  return parts.join(' · ')
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  CANCELED: 'Đã hủy',
}

const STATUS_VARIANT: Record<PlanStatus, 'default' | 'secondary' | 'outline'> = {
  DRAFT: 'default',
  APPROVED: 'secondary',
  CANCELED: 'outline',
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const colors: Record<PlanStatus, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    CANCELED: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <Badge variant={STATUS_VARIANT[status]} className={colors[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

// ── Create Plan Dialog ────────────────────────────────────────────────────────

interface CreatePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PlanRowDraft {
  key: number
  sku_id: string
  quantity: number
}

let rowKey = 0
function emptyRow(): PlanRowDraft {
  return { key: ++rowKey, sku_id: '', quantity: 1 }
}

function CreatePlanDialog({ open, onOpenChange }: CreatePlanDialogProps) {
  const [poId, setPoId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [rows, setRows] = useState<PlanRowDraft[]>([emptyRow()])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: posData } = usePOs({ limit: 200 })
  const pos = useMemo(() => posData?.items ?? [], [posData?.items])

  const { data: skusData } = useSKUs({ limit: 500 })
  const skuMap = useMemo(
    () => new Map((skusData?.items ?? []).map((s) => [s.id, s.code])),
    [skusData],
  )

  // Load PO line items when a PO is selected to auto-populate rows
  const { data: lineItems, isLoading: lineItemsLoading } = usePOLineItems(poId || null)

  const selectedPO = useMemo(() => pos.find((p) => p.id === poId), [pos, poId])

  const { mutate, isPending } = useCreatePlan()

  // Auto-populate rows when line items load for the selected PO.
  // SKU is fixed from PO — user can only adjust quantity.
  useEffect(() => {
    if (!lineItems) return
    setRows(
      lineItems.length > 0
        ? lineItems.map((li: LineItem) => ({ key: ++rowKey, sku_id: li.sku_id, quantity: li.quantity }))
        : [emptyRow()],
    )
  }, [lineItems])

  // Reset rows and auto-fill deadline when PO changes
  function handlePoChange(id: string) {
    setPoId(id)
    setRows([emptyRow()])
    setErrors({})
    // Auto-fill deadline from PO's expected_delivery
    const po = pos.find((p) => p.id === id)
    if (po?.expected_delivery) {
      setDeadline(po.expected_delivery.slice(0, 10)) // YYYY-MM-DD for input[type=date]
    } else {
      setDeadline('')
    }
  }

  function updateRowQuantity(key: number, quantity: number) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, quantity } : r)))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!poId) next.po_id = 'Chọn đơn hàng'
    const items = lineItems ?? []
    for (const row of rows) {
      if (!row.sku_id || row.quantity < 1) {
        next.rows = 'Mỗi dòng cần có sản phẩm và số lượng ≥ 1'
        break
      }
      const li = items.find((i) => i.sku_id === row.sku_id)
      if (li && row.quantity > li.quantity) {
        next.rows = `Số lượng không được vượt quá SL đơn hàng (${li.quantity})`
        break
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: CreatePlanInput = {
      po_id: poId,
      ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
      items: rows.map((r) => ({ sku_id: r.sku_id, quantity: r.quantity })),
    }
    mutate(input, {
      onSuccess: () => {
        toast.success('Tạo kế hoạch sản xuất thành công')
        onOpenChange(false)
        setPoId('')
        setDeadline('')
        setRows([emptyRow()])
        setErrors({})
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Tạo kế hoạch thất bại, thử lại'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo kế hoạch sản xuất mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PO picker */}
          <div className="space-y-1">
            <Label>Đơn hàng *</Label>
            <Select value={poId} onValueChange={handlePoChange}>
              <SelectTrigger>
                <SelectValue placeholder="— Chọn đơn hàng —" />
              </SelectTrigger>
              <SelectContent>
                {pos.map((po) => {
                  const summary = poSummary(po)
                  return (
                    <SelectItem key={po.id} value={po.id}>
                      <span className="font-medium">{po.code}</span>
                      {summary && (
                        <span className="ml-2 text-muted-foreground">{summary}</span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {errors.po_id && <p className="text-xs text-destructive">{errors.po_id}</p>}
            {selectedPO && (
              <p className="text-xs text-muted-foreground">
                Hạn giao hàng: {formatDate(selectedPO.expected_delivery)}
                {poSummary(selectedPO) && ` · ${poSummary(selectedPO)}`}
              </p>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <Label htmlFor="plan-deadline">Hạn hoàn thành</Label>
            <Input
              id="plan-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Items — auto-populated from PO line items */}
          <div className="space-y-2">
            <Label>Sản phẩm (từ đơn hàng)</Label>
            {!poId && (
              <p className="text-xs text-muted-foreground">Chọn đơn hàng để hiện danh sách sản phẩm</p>
            )}
            {poId && lineItemsLoading && (
              <p className="text-xs text-muted-foreground">Đang tải sản phẩm…</p>
            )}
            {poId && !lineItemsLoading && (lineItems ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">Đơn hàng không có sản phẩm</p>
            )}
            {poId && !lineItemsLoading && (lineItems ?? []).length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="w-28">SL đơn hàng</TableHead>
                    <TableHead className="w-28">SL sản xuất</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const li = (lineItems ?? []).find((i) => i.sku_id === row.sku_id)
                    return (
                      <TableRow key={row.key}>
                        <TableCell className="text-sm">
                          {skuMap.get(row.sku_id) ?? row.sku_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {li?.quantity ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={li?.quantity}
                            value={row.quantity}
                            onChange={(e) =>
                              updateRowQuantity(row.key, Number(e.target.value))
                            }
                            className="h-9"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
            {errors.rows && <p className="text-xs text-destructive">{errors.rows}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo kế hoạch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Table skeleton ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Main list content ─────────────────────────────────────────────────────────

const ALL_PLAN_STATUSES = '__all__'
const ALL_SKUS = '__all__'
const ALL_POS = '__all__'

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

function PlansContent() {
  const role = useCurrentRole()
  const canCreatePlan = can(role, 'create', 'plans')
  const canApprovePlan = can(role, 'approve', 'plans')
  const canCancelPlan = can(role, 'cancel', 'plans')

  const [createOpen, setCreateOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<ProductionPlan | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ProductionPlan | null>(null)

  const { page, search, limit, getParam, setPage, setSearch, setParam, setParams } =
    usePageParams(15)

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

  // URL-driven filters mirror /work-orders + /costing so planners can deep-link
  // (#183 DoD §3). Date range defaults to last 30 days.
  const statusFilter = (getParam('status') ?? ALL_PLAN_STATUSES) as PlanStatus | typeof ALL_PLAN_STATUSES
  const poFilter = getParam('po_id') ?? ALL_POS
  const skuFilter = getParam('sku_id') ?? ALL_SKUS
  const today = isoToday()
  const defaultFrom = useMemo(() => defaultFromIso(), [])
  const dateFrom = getParam('from') ?? defaultFrom
  const dateTo = getParam('to') ?? today
  const isDefaultRange = dateFrom === defaultFrom && dateTo === today
  const hasAnyFilter =
    !!normalizedSearch ||
    statusFilter !== ALL_PLAN_STATUSES ||
    poFilter !== ALL_POS ||
    skuFilter !== ALL_SKUS ||
    !isDefaultRange

  const filter = {
    page,
    limit,
    ...(statusFilter !== ALL_PLAN_STATUSES ? { status: statusFilter as PlanStatus } : {}),
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(poFilter !== ALL_POS ? { po_id: poFilter } : {}),
    ...(skuFilter !== ALL_SKUS ? { sku_id: skuFilter } : {}),
    from: dateFrom,
    to: dateTo,
  }

  const { data, isLoading, isFetching, isError } = usePlans(filter)
  const isPending = isFetching && inputValue !== debouncedSearch

  const { data: posData } = usePOs({ limit: 200 })
  const poMap = useMemo(
    () => new Map((posData?.items ?? []).map((p) => [p.id, p.code])),
    [posData],
  )
  const poList = useMemo(() => posData?.items ?? [], [posData?.items])

  const { data: skusData } = useSKUs({ limit: 200 })
  const skus = useMemo(() => skusData?.items ?? [], [skusData?.items])

  // Defensive client-side filter: if BE silently drops po_id / sku_id / date
  // params (the FE landed before BE confirmation), the toolbar should still
  // narrow the visible page. Mirrors the fallback used in /cutting-dispatch
  // and /costing.
  const filteredPlans = useMemo(() => {
    const items = data?.items ?? []
    return items.filter((plan) => {
      if (poFilter !== ALL_POS && plan.po_id !== poFilter) return false
      if (skuFilter !== ALL_SKUS) {
        const hasSku = (plan.items ?? []).some((it) => it.sku_id === skuFilter)
        if (!hasSku) return false
      }
      const created = (plan.created_at ?? '').slice(0, 10)
      if (dateFrom && created < dateFrom) return false
      if (dateTo && created > dateTo) return false
      return true
    })
  }, [data?.items, poFilter, skuFilter, dateFrom, dateTo])

  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  const { mutate: approve, isPending: approving } = useApprovePlan()
  const { mutate: cancel, isPending: canceling } = useCancelPlan()

  function clearAllFilters() {
    setInputValue('')
    setParams({
      search: undefined,
      status: undefined,
      po_id: undefined,
      sku_id: undefined,
      from: undefined,
      to: undefined,
    })
  }

  function resetDateRange() {
    setParams({ from: undefined, to: undefined })
  }

  function handleApprove() {
    if (!approveTarget) return
    approve(approveTarget.id, {
      onSuccess: () => {
        toast.success('Đã duyệt kế hoạch')
        setApproveTarget(null)
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Duyệt thất bại'))
      },
    })
  }

  function handleCancel() {
    if (!cancelTarget) return
    cancel(cancelTarget.id, {
      onSuccess: () => {
        toast.success('Đã hủy kế hoạch')
        setCancelTarget(null)
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Hủy thất bại'))
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-60">
          <Label className="text-xs text-muted-foreground">Tìm kiếm</Label>
          <SearchInput
            value={inputValue}
            onChange={(v) => setInputValue(v)}
            isPending={isPending}
            placeholder="Tìm theo mã đơn hàng, ghi chú…"
            containerClassName="mt-1 w-full"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Trạng thái</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setParam('status', v === ALL_PLAN_STATUSES ? undefined : v)}
          >
            <SelectTrigger className="mt-1 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PLAN_STATUSES}>Tất cả trạng thái</SelectItem>
              <SelectItem value="DRAFT">Nháp</SelectItem>
              <SelectItem value="APPROVED">Đã duyệt</SelectItem>
              <SelectItem value="CANCELED">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Đơn hàng</Label>
          <Select
            value={poFilter}
            onValueChange={(v) => setParam('po_id', v === ALL_POS ? undefined : v)}
          >
            <SelectTrigger className="mt-1 w-44">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_POS}>Tất cả đơn hàng</SelectItem>
              {poList.map((po) => (
                <SelectItem key={po.id} value={po.id}>
                  {po.code ?? po.id.slice(0, 8)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={resetDateRange}
              disabled={isDefaultRange}
              className="gap-1"
              title={isDefaultRange ? 'Đang ở mặc định 30 ngày gần nhất' : 'Đặt lại 30 ngày gần nhất'}
            >
              <RotateCcw className="size-3" />
              30 ngày
            </Button>
          </div>
        </div>

        {hasAnyFilter && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1">
            <X className="size-3" />
            Xoá bộ lọc
          </Button>
        )}

        <div className="ml-auto">
          {canCreatePlan ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Tạo kế hoạch
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem danh sách kế hoạch.</p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading
            ? 'Đang tải…'
            : hasAnyFilter
              ? `Kết quả lọc (${filteredPlans.length}${filteredPlans.length !== totalItems ? ` / ${totalItems}` : ''})`
              : `Tất cả kế hoạch (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách kế hoạch.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Đơn hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hạn hoàn thành</TableHead>
                <TableHead className="text-right">Sản phẩm</TableHead>
                <TableHead className="w-44 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {hasAnyFilter
                      ? 'Không tìm thấy kế hoạch nào khớp bộ lọc hiện tại.'
                      : 'Chưa có kế hoạch nào. Nhấn "Tạo kế hoạch" để bắt đầu.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/plans/${plan.id}`}
                        className="hover:underline"
                      >
                        {poMap.get(plan.po_id) ?? plan.po_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell>{plan.deadline ? formatDate(plan.deadline) : '—'}</TableCell>
                    <TableCell className="text-right">{plan.items?.length ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/plans/${plan.id}`}>Chi tiết</Link>
                        </Button>
                        {plan.status === 'DRAFT' && (
                          <>
                            {canApprovePlan && (
                              <Button
                                size="sm"
                                onClick={() => setApproveTarget(plan)}
                              >
                                Duyệt
                              </Button>
                            )}
                            {canCancelPlan && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setCancelTarget(plan)}
                              >
                                Hủy
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && !isError && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {canCreatePlan && <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />}

      <ConfirmModal
        open={canApprovePlan && approveTarget !== null}
        title="Duyệt kế hoạch sản xuất?"
        description={`Kế hoạch cho đơn hàng "${approveTarget ? (poMap.get(approveTarget.po_id) ?? approveTarget.po_id.slice(0, 8)) : ''}" sẽ chuyển sang trạng thái Đã duyệt. Hành động này không thể hoàn tác.`}
        confirmLabel="Duyệt"
        isPending={approving}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      <ConfirmModal
        open={canCancelPlan && cancelTarget !== null}
        title="Hủy kế hoạch sản xuất?"
        description={`Kế hoạch cho đơn hàng "${cancelTarget ? (poMap.get(cancelTarget.po_id) ?? cancelTarget.po_id.slice(0, 8)) : ''}" sẽ bị hủy và không thể khôi phục.`}
        confirmLabel="Hủy kế hoạch"
        confirmVariant="destructive"
        isPending={canceling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function PlansPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Kế hoạch sản xuất</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <PlansContent />
      </Suspense>
    </div>
  )
}
