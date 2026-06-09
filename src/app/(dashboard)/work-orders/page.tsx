'use client'


import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle, Calendar, Check, ChevronDown, ClipboardCheck, Loader2, MapPin, Package, Plus, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SearchInput } from '@/components/ui/search-input'
import { Label } from '@/components/ui/label'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useSKU } from '@/lib/hooks/use-skus'
import { useSuggestRemnants, useAllocateRemnant } from '@/lib/hooks/use-remnants'
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
  useWorkOrderList,
  useCreateWorkOrder,
  useAdvanceStatus,
  useWorkOrderConsumptions,
} from '@/lib/hooks/use-work-orders'
import { usePlans } from '@/lib/hooks/use-plans'
import { usePOs } from '@/lib/hooks/use-pos'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { evaluateStartCutGate, startCutTooltip } from '@/lib/auth/work-order-gate'
import { useMe } from '@/lib/hooks/use-auth'
import { useRemnantBypassedWorkOrders } from '@/lib/hooks/use-inventory'
import { ExportExcelButton } from '@/components/dashboard/export-excel-button'
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
  PARTIAL_COMPLETE: 'Hoàn thành một phần',
  COSTED: 'Đã tính giá',
  CANCELED: 'Đã huỷ',
}

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_CUTTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROCESSING: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  PARTIAL_COMPLETE: 'bg-amber-100 text-amber-800 border-amber-200',
  COSTED: 'bg-purple-100 text-purple-800 border-purple-200',
  CANCELED: 'bg-gray-100 text-gray-700 border-gray-200',
}

/** Next status in the monotonic state machine, null when terminal. */
const NEXT_STATUS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  PLANNED: 'IN_CUTTING',
  IN_CUTTING: 'IN_PROCESSING',
  IN_PROCESSING: 'COMPLETED',
  COMPLETED: 'COSTED',
  PARTIAL_COMPLETE: 'COSTED',
  COSTED: null,
  CANCELED: null,
}

/** CTA label for the advance button — describes the action, not the destination. */
const ADVANCE_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Bắt đầu cắt',
  IN_CUTTING: 'Hoàn thành cắt',
  IN_PROCESSING: 'Đánh dấu hoàn thành',
  COMPLETED: 'Tính giá',
  PARTIAL_COMPLETE: 'Tính giá',
  COSTED: '', // terminal — button never shown
  CANCELED: '', // terminal — button never shown
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

function formatPlanOptionLabel(plan: {
  id: string
  code?: string
  po_code?: string
  deadline?: string
  status?: string
}) {
  const code = plan.code?.trim() || `KH-${shortId(plan.id)}`
  const parts = [code]
  if (plan.po_code?.trim()) parts.push(`PO ${plan.po_code}`)
  if (plan.deadline) {
    const deadline = new Date(plan.deadline).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    parts.push(`HH ${deadline}`)
  }
  if (plan.status) parts.push(plan.status)
  return parts.join(' · ')
}

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => { },
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
  EXPIRED: 'Hết hạn',
}

const REMNANT_STATUS_CLASS: Record<RemnantStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-800 border-green-200',
  ALLOCATED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONSUMED: 'bg-gray-100 text-gray-600 border-gray-200',
  WASTE: 'bg-red-100 text-red-700 border-red-200',
  EXPIRED: 'bg-red-100 text-red-700 border-red-200',
}

interface RemnantSuggestionPanelProps {
  /** Pre-fetched suggestions (lifted up by parent so the dialog knows the count). */
  items: RemnantSuggestion[]
  isLoading: boolean
  /** Currently selected remnant id, or null when none picked. */
  selectedId: string | null
  /** Click handler — toggles selection (click again to deselect). */
  onSelect: (id: string | null) => void
}

function RemnantSuggestionPanel({ items, isLoading, selectedId, onSelect }: RemnantSuggestionPanelProps) {
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
        <span className="text-xs text-muted-foreground">Nhấn để chọn</span>
      </div>

      <div className="space-y-2">
        {items.map((s) => {
          const status = (s.remnant.status as RemnantStatus) ?? 'AVAILABLE'
          const ageDays = ageDaysFromIso(s.remnant.created_at)
          const isSelected = selectedId === s.remnant.id
          return (
            <button
              key={s.remnant.id}
              type="button"
              onClick={() => onSelect(isSelected ? null : s.remnant.id)}
              aria-pressed={isSelected}
              className={cn(
                'flex w-full items-start justify-between gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm transition-colors',
                'hover:border-primary/60 hover:bg-primary/5',
                isSelected && 'border-primary bg-primary/10 ring-2 ring-primary/30',
              )}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{s.rank}</span>
                  <span className="font-medium">
                    {s.remnant.dimensions.length_mm} × {s.remnant.dimensions.width_mm} mm
                  </span>
                  {isSelected && (
                    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-primary">
                      <Check className="size-3.5" />
                      Đã chọn
                    </span>
                  )}
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Remnant bypass confirmation dialog (BR-K05) ───────────────────────────────

interface RemnantBypassDialogProps {
  open: boolean
  suggestionCount: number
  isPending: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

function RemnantBypassDialog({
  open,
  suggestionCount,
  isPending,
  onConfirm,
  onCancel,
}: RemnantBypassDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const reasonInvalid = reason.trim().length < 10

  function handleClose() {
    setReason('')
    setTouched(false)
    onCancel()
  }

  function handleSubmit() {
    setTouched(true)
    if (reasonInvalid) return
    onConfirm(reason.trim())
    setReason('')
    setTouched(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? handleClose() : null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="size-5" aria-hidden="true" />
            Bỏ qua tấm lẻ phù hợp?
          </DialogTitle>
          <DialogDescription>
            Có {suggestionCount} tấm lẻ phù hợp đang sẵn có. Tạo lệnh không dùng tấm lẻ sẽ làm tăng
            tồn kho và được ghi vào nhật ký kiểm toán (<code>REMNANT_BYPASSED</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="remnant-bypass-reason">Lý do bỏ qua *</Label>
          <Textarea
            id="remnant-bypass-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            placeholder="vd: Tấm lẻ không cùng vân gỗ, lệnh khách yêu cầu chất lượng đồng nhất"
          />
          {touched && reasonInvalid && (
            <p className="text-xs text-destructive">Lý do phải dài ít nhất 10 ký tự.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Xác nhận bỏ qua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [bypassPromptOpen, setBypassPromptOpen] = useState(false)
  const [selectedRemnantId, setSelectedRemnantId] = useState<string | null>(null)

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

  // Lifted up so the dialog gates submit on the suggestion count (BR-K05).
  const { data: sku } = useSKU(skuId || null)
  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useSuggestRemnants(
    skuId,
    sku?.dimensions,
    3,
  )
  const suggestions: RemnantSuggestion[] = useMemo(() => suggestionsData ?? [], [suggestionsData])
  const hasFitRemnants = suggestions.length > 0

  const { mutate, isPending } = useCreateWorkOrder()
  const { mutateAsync: allocateRemnant, isPending: isAllocating } = useAllocateRemnant()

  function resetState() {
    setPlanId('')
    setSkuId('')
    setQuantity(1)
    setErrors({})
    setBypassPromptOpen(false)
    setSelectedRemnantId(null)
  }

  function handlePlanChange(newPlanId: string) {
    setPlanId(newPlanId)
    setSkuId('')
    setQuantity(1)
    setSelectedRemnantId(null)
    setErrors((prev) => ({ ...prev, plan_id: '', sku_id: '' }))
  }

  function handleSkuChange(newSkuId: string) {
    setSkuId(newSkuId)
    const item = planItems.find((i) => i.sku_id === newSkuId)
    if (item) setQuantity(item.quantity)
    setSelectedRemnantId(null)
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

  function submitCreate(bypassReason?: string) {
    const input: CreateWOInput = {
      plan_id: planId,
      sku_id: skuId,
      quantity,
      ...(bypassReason ? { bypass_reason: bypassReason } : {}),
    }
    mutate(input, {
      onSuccess: async (createdWO) => {
        if (selectedRemnantId) {
          try {
            await allocateRemnant({ remnantId: selectedRemnantId, workOrderId: createdWO.id })
            toast.success('Đã tạo lệnh và cấp tấm lẻ')
          } catch {
            toast.error('Đã tạo lệnh nhưng không cấp được tấm lẻ — vui lòng cấp thủ công')
          }
        }
        onOpenChange(false)
        resetState()
      },
    })
  }

  function handleSubmit() {
    if (!validate()) return
    // If a remnant is selected, allocate it and skip the bypass dialog.
    if (selectedRemnantId) {
      submitCreate()
      return
    }
    if (hasFitRemnants) {
      setBypassPromptOpen(true)
      return
    }
    submitCreate()
  }

  function handleBypassConfirm(reason: string) {
    setBypassPromptOpen(false)
    submitCreate(reason)
  }

  function handleClose() {
    onOpenChange(false)
    resetState()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : null)}>
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
            {skuId && (
              <RemnantSuggestionPanel
                items={suggestions}
                isLoading={isLoadingSuggestions}
                selectedId={selectedRemnantId}
                onSelect={setSelectedRemnantId}
              />
            )}

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
            <Button onClick={handleSubmit} disabled={isPending || isAllocating || isLoadingSuggestions}>
              {isPending || isAllocating ? 'Đang tạo…' : selectedRemnantId ? 'Tạo lệnh & cấp tấm lẻ' : 'Tạo lệnh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RemnantBypassDialog
        open={bypassPromptOpen}
        suggestionCount={suggestions.length}
        isPending={isPending}
        onConfirm={handleBypassConfirm}
        onCancel={() => setBypassPromptOpen(false)}
      />
    </>
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

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function thirtyDaysAgoISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Main list ─────────────────────────────────────────────────────────────────


interface PlanFilterComboboxProps {
  value: string
  selectedPlan: { id: string; code?: string; po_code?: string; deadline?: string; status?: string } | null
  options: Array<{ id: string; code?: string; po_code?: string; deadline?: string; status?: string }>
  searchValue: string
  onSearchChange: (value: string) => void
  isLoading: boolean
  onChange: (value: string) => void
}

function PlanFilterCombobox({
  value,
  selectedPlan,
  options,
  searchValue,
  onSearchChange,
  isLoading,
  onChange,
}: PlanFilterComboboxProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const selectedLabel = value === 'ALL'
    ? 'Tất cả kế hoạch'
    : selectedPlan
      ? formatPlanOptionLabel(selectedPlan)
      : `Kế hoạch ${shortId(value)}`

  return (
    <div ref={rootRef} className="relative w-72">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label="Lọc theo kế hoạch"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs',
          'outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        )}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full rounded-md border bg-popover p-2 shadow-md">
          <SearchInput
            autoFocus
            value={searchValue}
            onChange={onSearchChange}
            isPending={isLoading}
            placeholder="Tìm mã KH hoặc mã PO..."
            className="h-9"
          />

          <div className="mt-2 max-h-72 overflow-y-auto rounded-md border">
            <button
              type="button"
              onClick={() => {
                onChange('ALL')
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                value === 'ALL' && 'bg-accent/60',
              )}
            >
              <Check className={cn('size-4 shrink-0', value === 'ALL' ? 'opacity-100' : 'opacity-0')} />
              <span className="truncate">Tất cả kế hoạch</span>
            </button>

            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang tìm kế hoạch...
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">
                Không tìm thấy kế hoạch phù hợp.
              </div>
            ) : (
              options.map((plan) => {
                const selected = plan.id === value
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => {
                      onChange(plan.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                      selected && 'bg-accent/60',
                    )}
                  >
                    <Check className={cn('mt-0.5 size-4 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{plan.code || `KH-${shortId(plan.id)}`}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatPlanOptionLabel(plan)}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkOrdersContent() {
  const role = useCurrentRole()
  const { data: me } = useMe()
  const canCreateWorkOrder = can(role, 'create', 'work_orders')
  const canAdvanceWorkOrder = can(role, 'advance', 'work_orders')

  const [planSearch, setPlanSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [advanceTarget, setAdvanceTarget] = useState<WorkOrder | null>(null)

  const { page, limit, getParam, setPage, setParam, setParams } = usePageParams(15)
  const statusFilter = (getParam('status') ?? 'ALL') as WorkOrderStatus | 'ALL'
  const planFilter = getParam('plan_id') ?? 'ALL'
  const debouncedPlanSearch = useDebounce(planSearch, 300)

  // Date filter — URL-driven, default to last 30 days
  const today = todayISO()
  const dateFrom = getParam('from') ?? thirtyDaysAgoISO()
  const dateTo = getParam('to') ?? today
  const isViewingToday = dateFrom === today && dateTo === today

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(planFilter !== 'ALL' ? { plan_id: planFilter } : {}),
    from: dateFrom,
    to: dateTo,
    limit,
  }

  const {
    items: workOrders,
    total,
    totalIsEstimate,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isError,
  } = useWorkOrderList(filter)

  const totalLabel = totalIsEstimate ? `~${total}` : `${total}`

  const { data: plansData, isFetching: isFetchingPlans } = usePlans({
    status: 'APPROVED',
    search: debouncedPlanSearch.trim() || undefined,
    limit: 20,
  })
  const visiblePlans = useMemo(() => plansData?.items ?? [], [plansData?.items])
  const { data: selectedPlanData } = usePlans({
    status: 'APPROVED',
    search: planFilter !== 'ALL' ? planFilter : undefined,
    limit: 20,
  })
  const selectedPlan = useMemo(
    () => (planFilter === 'ALL' ? null : (selectedPlanData?.items ?? []).find((p) => p.id === planFilter) ?? null),
    [planFilter, selectedPlanData?.items],
  )
  const planById = useMemo(
    () => Object.fromEntries(
      [...visiblePlans, ...(selectedPlan ? [selectedPlan] : [])].map((p) => [p.id, p]),
    ),
    [visiblePlans, selectedPlan],
  )

  const { data: posData } = usePOs({ limit: 200 })
  const poMap = useMemo(
    () => new Map((posData?.items ?? []).map((p) => [p.id, p.code])),
    [posData],
  )

  // Build a Map<wo_id, reason> of bypassed WOs to badge in the list (BR-K05).
  const { reasonByWorkOrderId } = useRemnantBypassedWorkOrders()

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

  function renderAdvanceCell(wo: WorkOrder) {
    if (wo.status !== 'PLANNED') {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdvanceTarget(wo)}
        >
          {ADVANCE_LABEL[wo.status]}
        </Button>
      )
    }

    const gate = evaluateStartCutGate({
      wo,
      currentUserId: me?.id ?? null,
      role,
    })

    if (gate.kind === 'allowed') {
      return (
        <Button size="sm" onClick={() => setAdvanceTarget(wo)}>
          {ADVANCE_LABEL.PLANNED}
        </Button>
      )
    }

    if (gate.kind === 'unassigned-dispatchable') {
      return (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/cutting-dispatch?focus=${wo.id}`}>Điều phối</Link>
        </Button>
      )
    }

    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        title={startCutTooltip(gate)}
      >
        {ADVANCE_LABEL.PLANNED}
      </Button>
    )
  }

  function renderWorkOrderRow(wo: WorkOrder, muted = false) {
    const canAdvance = NEXT_STATUS[wo.status] !== null
    const bypassReason = reasonByWorkOrderId.get(wo.id)
    return (
      <TableRow
        key={wo.id}
        className={cn(muted && 'opacity-50')}
      >
        <TableCell className="font-mono text-sm font-medium">
          <div className="flex items-center gap-2">
            <Link href={`/work-orders/${wo.id}`} className="hover:underline">
              {shortId(wo.id)}
            </Link>
            {bypassReason !== undefined && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-xs font-normal text-amber-800"
                title={bypassReason || 'Không ghi lý do'}
              >
                <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
                Bỏ qua tấm lẻ
              </Badge>
            )}
          </div>
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
            {canAdvance && canAdvanceWorkOrder && renderAdvanceCell(wo)}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setParam('status', v === 'ALL' ? undefined : v) }}
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

          <PlanFilterCombobox
            value={planFilter}
            selectedPlan={selectedPlan}
            options={visiblePlans}
            searchValue={planSearch}
            onSearchChange={setPlanSearch}
            isLoading={isFetchingPlans}
            onChange={(v) => {
              setParam('plan_id', v === 'ALL' ? undefined : v)
              setPage(1)
            }}
          />

          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              aria-label="Từ ngày"
              onChange={(e) => {
                const val = e.target.value
                setParams({ from: val || undefined, to: dateTo !== today ? dateTo : val || undefined })
              }}
              className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground text-sm" aria-hidden="true">–</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              aria-label="Đến ngày"
              onChange={(e) => {
                const val = e.target.value
                setParams({ from: dateFrom, to: val || undefined })
              }}
              className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {!isViewingToday && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParams({ from: undefined, to: undefined })}
                className="gap-1"
              >
                <RotateCcw className="size-3" />
                Hôm nay
              </Button>
            )}
          </div>
        </div>

        {canCreateWorkOrder ? (
          <div className="flex items-center gap-2">
            <ExportExcelButton
              report="work-orders"
              filter={{ from: dateFrom, to: dateTo }}
            />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Tạo lệnh
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ExportExcelButton
              report="work-orders"
              filter={{ from: dateFrom, to: dateTo }}
            />
            <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem danh sách lệnh cắt.</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading
            ? 'Đang tải…'
            : isViewingToday
              ? `Lệnh hôm nay (${totalLabel})`
              : `Kết quả (${totalLabel} lệnh)`}
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
                    {isViewingToday
                      ? 'Hôm nay chưa có lệnh sản xuất nào.'
                      : 'Không có lệnh nào trong khoảng thời gian đã chọn.'}
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => renderWorkOrderRow(wo))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
          </Button>
        </div>
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
