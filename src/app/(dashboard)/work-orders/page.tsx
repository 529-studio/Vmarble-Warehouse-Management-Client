'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Plus } from 'lucide-react'
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
  useWorkOrders,
  useCreateWorkOrder,
  useAdvanceStatus,
} from '@/lib/hooks/use-work-orders'
import { usePlans } from '@/lib/hooks/use-plans'
import { useSKUs } from '@/lib/hooks/use-skus'
import type {
  WorkOrderStatus,
  WorkOrder,
  CreateWOInput,
  AdvanceStatusInput,
} from '@/types/api'

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Kế hoạch',
  IN_CUTTING: 'Đang cắt',
  IN_PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  COSTED: 'Đã tính giá',
}

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_CUTTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROCESSING: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  COSTED: 'bg-purple-100 text-purple-800 border-purple-200',
}

/** Next status in the monotonic state machine, null when terminal. */
const NEXT_STATUS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  PLANNED: 'IN_CUTTING',
  IN_CUTTING: 'IN_PROCESSING',
  IN_PROCESSING: 'COMPLETED',
  COMPLETED: 'COSTED',
  COSTED: null,
}

function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ── Table skeleton ────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Create WO Dialog ──────────────────────────────────────────────────────────

interface CreateWODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateWODialog({ open, onOpenChange }: CreateWODialogProps) {
  const [planId, setPlanId] = useState('')
  const [skuId, setSkuId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: plansData } = usePlans({ status: 'APPROVED', limit: 200 })
  const approvedPlans = plansData?.items ?? []

  const { data: skusData } = useSKUs({ limit: 200 })
  const skus = skusData?.items ?? []

  const { mutate, isPending } = useCreateWorkOrder()

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!planId) next.plan_id = 'Chọn kế hoạch'
    if (!skuId) next.sku_id = 'Chọn sản phẩm'
    if (quantity < 1) next.quantity = 'Số lượng phải ≥ 1'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: CreateWOInput = { plan_id: planId, sku_id: skuId, quantity }
    mutate(input, {
      onSuccess: () => {
        onOpenChange(false)
        setPlanId('')
        setSkuId('')
        setQuantity(1)
        setErrors({})
      },
    })
  }

  function handleClose() {
    onOpenChange(false)
    setPlanId('')
    setSkuId('')
    setQuantity(1)
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo lệnh sản xuất mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Kế hoạch *</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="— Chọn kế hoạch đã duyệt —" />
              </SelectTrigger>
              <SelectContent>
                {approvedPlans.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    Không có kế hoạch đã duyệt
                  </SelectItem>
                )}
                {approvedPlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.po_code ?? shortId(p.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_id && <p className="text-xs text-destructive">{errors.plan_id}</p>}
          </div>

          <div className="space-y-1">
            <Label>Sản phẩm *</Label>
            <Select value={skuId} onValueChange={setSkuId}>
              <SelectTrigger>
                <SelectValue placeholder="— Chọn SKU —" />
              </SelectTrigger>
              <SelectContent>
                {skus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sku_id && <p className="text-xs text-destructive">{errors.sku_id}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="wo-quantity">Số lượng *</Label>
            <Input
              id="wo-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo lệnh'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Advance confirm dialog ────────────────────────────────────────────────────

interface AdvanceDialogProps {
  wo: WorkOrder | null
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function AdvanceDialog({ wo, onConfirm, onCancel, isPending }: AdvanceDialogProps) {
  if (!wo) return null
  const next = NEXT_STATUS[wo.status]
  if (!next) return null
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chuyển trạng thái lệnh sản xuất?</AlertDialogTitle>
          <AlertDialogDescription>
            Lệnh <span className="font-medium">{shortId(wo.id)}</span> sẽ chuyển từ{' '}
            <span className="font-medium">{STATUS_LABEL[wo.status]}</span> sang{' '}
            <span className="font-medium">{STATUS_LABEL[next]}</span>. Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Đang xử lý…' : 'Xác nhận'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Main list ─────────────────────────────────────────────────────────────────

function WorkOrdersContent() {
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL')
  const [planFilter, setPlanFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<WorkOrder | null>(null)

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(planFilter !== 'ALL' ? { plan_id: planFilter } : {}),
  }

  const { data, isLoading, isError } = useWorkOrders(filter)
  const workOrders = data?.items ?? []
  const totalItems = data?.total_items ?? 0

  const { data: plansData } = usePlans({ limit: 200 })
  const allPlans = plansData?.items ?? []

  const { mutate: advance, isPending: advancing } = useAdvanceStatus()

  function handleAdvanceConfirm() {
    if (!advanceTarget) return
    const next = NEXT_STATUS[advanceTarget.status]
    if (!next) return
    const input: AdvanceStatusInput = { status: next }
    advance(
      { id: advanceTarget.id, input },
      { onSettled: () => setAdvanceTarget(null) },
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as WorkOrderStatus | 'ALL')}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {(Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={planFilter}
            onValueChange={setPlanFilter}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả kế hoạch</SelectItem>
              {allPlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.po_code ?? shortId(p.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Tạo lệnh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Tất cả lệnh sản xuất (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách lệnh sản xuất.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã WO</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Kế hoạch</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Phân công</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-36 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Chưa có lệnh sản xuất nào.
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => {
                  const canAdvance = NEXT_STATUS[wo.status] !== null
                  return (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/work-orders/${wo.id}`}
                          className="hover:underline"
                        >
                          {shortId(wo.id)}
                        </Link>
                      </TableCell>
                      <TableCell>{wo.sku_code ?? wo.sku_id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(wo.plan_id)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wo.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.assigned_to_name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(wo.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/work-orders/${wo.id}`}>Chi tiết</Link>
                          </Button>
                          {canAdvance && (
                            <Button
                              size="sm"
                              onClick={() => setAdvanceTarget(wo)}
                            >
                              Advance
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateWODialog open={createOpen} onOpenChange={setCreateOpen} />

      <AdvanceDialog
        wo={advanceTarget}
        onConfirm={handleAdvanceConfirm}
        onCancel={() => setAdvanceTarget(null)}
        isPending={advancing}
      />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Lệnh sản xuất</h1>
      </div>
      <WorkOrdersContent />
    </div>
  )
}
