'use client'

import { Suspense, useState, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ClipboardCheck, MapPin, Package, Plus, X } from 'lucide-react'
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
import { useMaterials } from '@/lib/hooks/use-materials'
import { useSKU } from '@/lib/hooks/use-skus'
import { useSuggestRemnants } from '@/lib/hooks/use-remnants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
  useWorkOrderConsumptions,
} from '@/lib/hooks/use-work-orders'
import { usePlans } from '@/lib/hooks/use-plans'
import { usePOs } from '@/lib/hooks/use-pos'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { DataPagination } from '@/components/ui/data-pagination'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type {
  WorkOrderStatus,
  WorkOrder,
  CreateWOInput,
  AdvanceStatusInput,
  RemnantSuggestion,
  RemnantStatus,
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

/** CTA label for the advance button — describes the action, not the destination. */
const ADVANCE_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Bắt đầu cắt',
  IN_CUTTING: 'Hoàn thành cắt',
  IN_PROCESSING: 'Đánh dấu hoàn thành',
  COMPLETED: 'Tính giá',
  COSTED: '', // terminal — button never shown
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

/** Human-readable label for a production plan. poCode is resolved from a PO lookup map by the caller. */
function planLabel(p: { id: string; deadline?: string }, poCode?: string): string {
  const base = poCode ? `PO ${poCode}` : `KH-${shortId(p.id)}`
  if (p.deadline) {
    const d = new Date(p.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${base} · HH ${d}`
  }
  return base
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
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

// ── Remnant suggestion panel ──────────────────────────────────────────────────

function ageDaysFromIso(iso: string | undefined): number | null {
  if (!iso) return null
  const created = new Date(iso)
  if (isNaN(created.getTime())) return null
  return Math.floor((new Date().getTime() - created.getTime()) / 86_400_000)
}

const REMNANT_STATUS_LABEL: Record<RemnantStatus, string> = {
  AVAILABLE: 'Có sẵn',
  ALLOCATED: 'Đã phân bổ',
  CONSUMED: 'Đã dùng',
  WASTE: 'Hao hụt',
}

const REMNANT_STATUS_CLASS: Record<RemnantStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  ALLOCATED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONSUMED: 'bg-gray-100 text-gray-600 border-gray-200',
  WASTE: 'bg-red-100 text-red-700 border-red-200',
}

interface RemnantSuggestionPanelProps {
  skuId: string
}

function RemnantSuggestionPanel({ skuId }: RemnantSuggestionPanelProps) {
  const [dismissed, setDismissed] = useState(false)
  const [showSkipForm, setShowSkipForm] = useState(false)
  const [skipReason, setSkipReason] = useState('')

  const { data: sku } = useSKU(skuId || null)
  const { data: suggestions, isLoading } = useSuggestRemnants(skuId, sku?.dimensions, 3)
  const items: RemnantSuggestion[] = suggestions ?? []

  function handleSkip() {
    // Log skip decision for audit trail — no backend endpoint yet
    console.info('[BR-K05] Remnant suggestion skipped', {
      skuId,
      reason: skipReason.trim() || '(không ghi lý do)',
    })
    setDismissed(true)
  }

  if (dismissed || !skuId) return null

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Đang tìm tấm lẻ phù hợp…</span>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2.5">
        <Package className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Không tìm thấy tấm lẻ phù hợp — sẽ dùng tấm nguyên.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="size-4 text-primary" />
          <span className="text-sm font-medium">Gợi ý tấm lẻ ({items.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setShowSkipForm(true)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <X className="size-3" />
          Bỏ qua
        </button>
      </div>

      <div className="space-y-2">
        {items.map((s) => {
          const status = (s.remnant.status as RemnantStatus) ?? 'AVAILABLE'
          const ageDays = ageDaysFromIso(s.remnant.created_at)
          return (
            <div
              key={s.remnant.id}
              className="flex items-start justify-between gap-3 rounded-md border bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{s.rank}</span>
                  <span className="font-medium">
                    {s.remnant.dimensions.length_mm} × {s.remnant.dimensions.width_mm} mm
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={REMNANT_STATUS_CLASS[status] ?? 'bg-gray-100 text-gray-600'}
                  >
                    {REMNANT_STATUS_LABEL[status] ?? status}
                  </Badge>
                  {ageDays !== null && (
                    <span className="text-xs text-muted-foreground">{ageDays} ngày</span>
                  )}
                  {s.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {s.location.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showSkipForm ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          <Label className="text-xs text-muted-foreground">Lý do bỏ qua (tùy chọn)</Label>
          <Textarea
            placeholder="Ví dụ: Tấm lẻ không đạt chất lượng yêu cầu…"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleSkip}>
              Xác nhận bỏ qua
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSkipForm(false)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

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
  const approvedPlans = useMemo(() => plansData?.items ?? [], [plansData?.items])

  const { data: posDataDialog } = usePOs({ limit: 200 })
  const poMapDialog = useMemo(
    () => new Map((posDataDialog?.items ?? []).map((p) => [p.id, p.code])),
    [posDataDialog],
  )

  // Derive available SKUs from the selected plan's items — no free SKU dropdown.
  const selectedPlan = useMemo(
    () => approvedPlans.find((p) => p.id === planId),
    [approvedPlans, planId],
  )
  const planItems = useMemo(() => selectedPlan?.items ?? [], [selectedPlan?.items])

  // Find the selected plan item to enforce max quantity.
  const selectedPlanItem = useMemo(
    () => planItems.find((item) => item.sku_id === skuId),
    [planItems, skuId],
  )
  const maxQuantity = selectedPlanItem?.quantity ?? 1

  const { mutate, isPending } = useCreateWorkOrder()

  function handlePlanChange(newPlanId: string) {
    setPlanId(newPlanId)
    setSkuId('')
    setQuantity(1)
    setErrors((prev) => ({ ...prev, plan_id: '', sku_id: '' }))
  }

  function handleSkuChange(newSkuId: string) {
    setSkuId(newSkuId)
    const item = planItems.find((i) => i.sku_id === newSkuId)
    if (item) setQuantity(item.quantity)
    setErrors((prev) => ({ ...prev, sku_id: '' }))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!planId) next.plan_id = 'Chọn kế hoạch'
    if (!skuId) next.sku_id = 'Chọn sản phẩm'
    if (quantity < 1) next.quantity = 'Số lượng phải ≥ 1'
    if (quantity > maxQuantity) next.quantity = `Số lượng không được vượt quá ${maxQuantity}`
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo lệnh cắt mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Kế hoạch *</Label>
            <Select value={planId} onValueChange={handlePlanChange}>
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
                    {planLabel(p, poMapDialog.get(p.po_id))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.plan_id && <p className="text-xs text-destructive">{errors.plan_id}</p>}
          </div>

          <div className="space-y-1">
            <Label>Sản phẩm (từ kế hoạch) *</Label>
            <Select
              value={skuId}
              onValueChange={handleSkuChange}
              disabled={!planId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !planId
                      ? '— Chọn kế hoạch trước —'
                      : planItems.length === 0
                        ? '— Kế hoạch không có sản phẩm —'
                        : '— Chọn sản phẩm —'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {planItems.map((item) => (
                  <SelectItem key={item.sku_id} value={item.sku_id}>
                    {item.sku_code ?? item.sku_id.slice(0, 8)} — {item.sku_name ?? 'N/A'} (SL: {item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sku_id && <p className="text-xs text-destructive">{errors.sku_id}</p>}
          </div>

          {/* Remnant suggestions — shown when a SKU is selected (BR-K05) */}
          {skuId && <RemnantSuggestionPanel skuId={skuId} />}

          <div className="space-y-1">
            <Label htmlFor="wo-quantity">
              Số lượng *{selectedPlanItem ? ` (tối đa: ${maxQuantity})` : ''}
            </Label>
            <Input
              id="wo-quantity"
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              disabled={!skuId}
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
  wo: WorkOrder
  onConfirm: (materialId?: string) => void
  onCancel: () => void
  isPending: boolean
}

function AdvanceDialog({ wo, onConfirm, onCancel, isPending }: AdvanceDialogProps) {
  const NONE = '__none__'
  const [selectedMaterialId, setSelectedMaterialId] = useState(NONE)

  const isPlannedToInCutting = wo.status === 'PLANNED'
  const isProcessingToCompleted = wo.status === 'IN_PROCESSING'

  const { data: materialsData, isLoading: isLoadingMaterials } = useMaterials({ limit: 200 })
  const materials = materialsData?.items ?? []
  const { data: sku, isLoading: loadingSku } = useSKU(wo.sku_id)
  const {
    data: consumptions,
    isLoading: loadingConsumptions,
  } = useWorkOrderConsumptions(isProcessingToCompleted ? wo.id : '')

  const hasMetalConsumption = (consumptions ?? []).some((c) => c.material_type === 'METAL')
  const requiresMetal = sku?.requires_metal ?? false
  const blockedByMissingMetal =
    isProcessingToCompleted && requiresMetal && !hasMetalConsumption

  const next = NEXT_STATUS[wo.status]
  if (!next) return null

  function handleConfirm() {
    const materialId = isPlannedToInCutting && selectedMaterialId !== NONE ? selectedMaterialId : undefined
    onConfirm(materialId)
  }

  function handleCancel() {
    onCancel()
  }

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chuyển trạng thái lệnh cắt?</AlertDialogTitle>
          <AlertDialogDescription>
            Lệnh <span className="font-medium">{shortId(wo.id)}</span> sẽ chuyển từ{' '}
            <span className="font-medium">{STATUS_LABEL[wo.status]}</span> sang{' '}
            <span className="font-medium">{STATUS_LABEL[next]}</span>. Hành động này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Material picker — only shown for PLANNED → IN_CUTTING */}
        {isPlannedToInCutting && (
          <div className="space-y-1.5 py-1">
            <Label>Loại nguyên liệu *</Label>
            <Select
              value={selectedMaterialId}
              onValueChange={setSelectedMaterialId}
              disabled={isLoadingMaterials}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingMaterials ? 'Đang tải nguyên liệu…' : 'Chọn loại nguyên liệu'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Chọn loại nguyên liệu —</SelectItem>
                {materials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name} ({material.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Công nhân CNC sẽ chọn lô và tấm cụ thể tại kiosk theo loại nguyên liệu này.
            </p>
          </div>
        )}

        {blockedByMissingMetal && !loadingConsumptions && !loadingSku && (
          <p className="text-sm text-destructive">
            SKU này yêu cầu vật tư METAL. Cần ghi nhận ít nhất 1 vật tư METAL trước khi hoàn thành.
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isPending ||
              loadingSku ||
              loadingConsumptions ||
              blockedByMissingMetal ||
              (isPlannedToInCutting && selectedMaterialId === NONE)
            }
          >
            {isPending ? 'Đang xử lý…' : 'Xác nhận'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Main list ─────────────────────────────────────────────────────────────────

function WorkOrdersContent() {
  const role = useCurrentRole()
  const canCreateWorkOrder = can(role, 'create', 'work_orders')
  const canAdvanceWorkOrder = can(role, 'advance', 'work_orders')

  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL')
  const [planFilter, setPlanFilter] = useState<string>('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<WorkOrder | null>(null)

  const { page, limit, setPage } = usePageParams(15)

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(planFilter !== 'ALL' ? { plan_id: planFilter } : {}),
    page,
    limit,
  }

  const { data, isLoading, isFetching, isError } = useWorkOrders(filter)
  const workOrders = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  const { data: plansData } = usePlans({ limit: 200 })
  const allPlans = useMemo(() => plansData?.items ?? [], [plansData?.items])
  const planById = useMemo(
    () => Object.fromEntries(allPlans.map((p) => [p.id, p])),
    [allPlans],
  )

  const { data: posData } = usePOs({ limit: 200 })
  const poMap = useMemo(
    () => new Map((posData?.items ?? []).map((p) => [p.id, p.code])),
    [posData],
  )

  const { mutate: advance, isPending: advancing } = useAdvanceStatus()

  function handleAdvanceConfirm(materialId?: string) {
    if (!advanceTarget) return
    const next = NEXT_STATUS[advanceTarget.status]
    if (!next) return
    const input: AdvanceStatusInput = { status: next, material_id: materialId }
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
            onValueChange={(v) => { setStatusFilter(v as WorkOrderStatus | 'ALL'); setPage(1) }}
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
            onValueChange={(v) => { setPlanFilter(v); setPage(1) }}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả kế hoạch</SelectItem>
              {allPlans.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {planLabel(p, poMap.get(p.po_id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canCreateWorkOrder ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo lệnh
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem danh sách lệnh cắt.</p>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Tất cả lệnh cắt (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách lệnh cắt.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Lệnh Cắt</TableHead>
                <TableHead>Sản phẩm</TableHead>
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
                    Chưa có lệnh cắt nào.
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
                      <TableCell>{wo.sku_code ?? wo.sku_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {planById[wo.plan_id]
                          ? planLabel(planById[wo.plan_id], poMap.get(planById[wo.plan_id].po_id))
                          : `KH-${shortId(wo.plan_id)}`}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wo.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.assigned_to ? shortId(wo.assigned_to) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(wo.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/work-orders/${wo.id}`}>Chi tiết</Link>
                          </Button>
                          {canAdvance && canAdvanceWorkOrder && (
                            <Button
                              size="sm"
                              variant={wo.status === 'PLANNED' ? 'default' : 'outline'}
                              onClick={() => setAdvanceTarget(wo)}
                            >
                              {ADVANCE_LABEL[wo.status]}
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

      {!isLoading && !isError && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {canCreateWorkOrder && <CreateWODialog open={createOpen} onOpenChange={setCreateOpen} />}

      {canAdvanceWorkOrder && advanceTarget && (
        <AdvanceDialog
          key={advanceTarget.id}
          wo={advanceTarget}
          onConfirm={handleAdvanceConfirm}
          onCancel={() => setAdvanceTarget(null)}
          isPending={advancing}
        />
      )}
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
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <WorkOrdersContent />
      </Suspense>
    </div>
  )
}
