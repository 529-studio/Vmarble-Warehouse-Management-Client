'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ClipboardList, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  const pos = posData?.items ?? []

  // Load PO line items when a PO is selected to auto-populate rows
  const { data: lineItems } = usePOLineItems(poId || null)

  const { data: skusData } = useSKUs({ limit: 200 })
  const skus = skusData?.items ?? []

  const { mutate, isPending } = useCreatePlan()

  // Auto-populate rows when line items load for the selected PO
  useEffect(() => {
    if (!lineItems) return
    setRows(
      lineItems.length > 0
        ? lineItems.map((li: LineItem) => ({ key: ++rowKey, sku_id: li.sku_id, quantity: li.quantity }))
        : [emptyRow()],
    )
  }, [lineItems])

  // Reset rows to a blank row when PO changes (before lineItems arrive)
  function handlePoChange(id: string) {
    setPoId(id)
    setRows([emptyRow()])
  }

  function updateRow(key: number, patch: Partial<PlanRowDraft>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!poId) next.po_id = 'Chọn đơn hàng'
    const invalid = rows.some((r) => !r.sku_id || r.quantity < 1)
    if (invalid) next.rows = 'Mỗi dòng cần chọn sản phẩm và số lượng ≥ 1'
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
        toast.error(err instanceof Error ? err.message : 'Tạo kế hoạch thất bại, thử lại')
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
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <Label htmlFor="plan-deadline">Hạn hoàn thành *</Label>
            <Input
              id="plan-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {errors.deadline && <p className="text-xs text-destructive">{errors.deadline}</p>}
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label>Sản phẩm</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="w-28">Số lượng</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <Select
                        value={row.sku_id}
                        onValueChange={(v) => updateRow(row.key, { sku_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— Chọn —" />
                        </SelectTrigger>
                        <SelectContent>
                          {skus.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.code} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.key, { quantity: Number(e.target.value) })
                        }
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={rows.length === 1}
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      >
                        ✕
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {errors.rows && <p className="text-xs text-destructive">{errors.rows}</p>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              + Thêm dòng
            </Button>
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

// ── Confirm action dialog ─────────────────────────────────────────────────────

interface ConfirmActionDialogProps {
  open: boolean
  title: string
  description: string
  actionLabel: string
  actionVariant?: 'default' | 'destructive'
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmActionDialog({
  open,
  title,
  description,
  actionLabel,
  actionVariant = 'default',
  isPending,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className={
              actionVariant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {isPending ? 'Đang xử lý…' : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<ProductionPlan | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ProductionPlan | null>(null)

  const filter = statusFilter === 'ALL' ? {} : { status: statusFilter }
  const { data, isLoading, isError } = usePlans(filter)
  const plans = data?.items ?? []
  const totalItems = data?.total_items ?? 0

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
        toast.error(err instanceof Error ? err.message : 'Duyệt thất bại')
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
        toast.error(err instanceof Error ? err.message : 'Hủy thất bại')
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

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Tạo kế hoạch
        </Button>
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
                        {plan.po_code ?? plan.po_id.slice(0, 8)}
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
                            <Button
                              size="sm"
                              onClick={() => setApproveTarget(plan)}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCancelTarget(plan)}
                            >
                              Hủy
                            </Button>
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

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmActionDialog
        open={approveTarget !== null}
        title="Duyệt kế hoạch sản xuất?"
        description={`Kế hoạch cho đơn hàng "${approveTarget?.po_code ?? ''}" sẽ chuyển sang trạng thái Đã duyệt. Hành động này không thể hoàn tác.`}
        actionLabel="Duyệt"
        isPending={approving}
        onConfirm={handleApprove}
        onCancel={() => setApproveTarget(null)}
      />

      <ConfirmActionDialog
        open={cancelTarget !== null}
        title="Hủy kế hoạch sản xuất?"
        description={`Kế hoạch cho đơn hàng "${cancelTarget?.po_code ?? ''}" sẽ bị hủy và không thể khôi phục.`}
        actionLabel="Hủy kế hoạch"
        actionVariant="destructive"
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
