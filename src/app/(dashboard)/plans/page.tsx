'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClipboardList, Plus } from 'lucide-react'
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
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { PlanStatus, ProductionPlan, CreatePlanInput, LineItem } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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
                {pos.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.po_id && <p className="text-xs text-destructive">{errors.po_id}</p>}
            {selectedPO && (
              <p className="text-xs text-muted-foreground">
                Hạn giao hàng: {formatDate(selectedPO.expected_delivery)}
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

function PlansContent() {
  const role = useMemo(() => getCurrentRoleFromCookie(), [])
  const canCreatePlan = can(role, 'create', 'plans')
  const canApprovePlan = can(role, 'approve', 'plans')
  const canCancelPlan = can(role, 'cancel', 'plans')

  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<ProductionPlan | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ProductionPlan | null>(null)

  const filter = statusFilter === 'ALL' ? {} : { status: statusFilter }
  const { data, isLoading, isError } = usePlans(filter)
  const plans = data?.items ?? []
  const totalItems = data?.total_items ?? 0

  const { data: posData } = usePOs({ limit: 200 })
  const poMap = useMemo(
    () => new Map((posData?.items ?? []).map((p) => [p.id, p.code])),
    [posData],
  )

  const { mutate: approve, isPending: approving } = useApprovePlan()
  const { mutate: cancel, isPending: canceling } = useCancelPlan()

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as PlanStatus | 'ALL')}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            <SelectItem value="DRAFT">Nháp</SelectItem>
            <SelectItem value="APPROVED">Đã duyệt</SelectItem>
            <SelectItem value="CANCELED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>

        {canCreatePlan ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo kế hoạch
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem danh sách kế hoạch.</p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Tất cả kế hoạch (${totalItems})`}
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
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Chưa có kế hoạch nào. Nhấn &quot;Tạo kế hoạch&quot; để bắt đầu.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
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
      <PlansContent />
    </div>
  )
}
