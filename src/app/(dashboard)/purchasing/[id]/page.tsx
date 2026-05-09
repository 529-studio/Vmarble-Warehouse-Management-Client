'use client'

import { use, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowLeft, Truck, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ConfirmModal } from '@/components/ui/confirm-modal'
import {
  useMPO,
  useAddMPOItem,
  useRemoveMPOItem,
  useOrderMPO,
  useReceiveMPO,
  useCancelMPO,
} from '@/lib/hooks/use-purchasing'
import { useMaterials } from '@/lib/hooks/use-materials'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { MPOStatus, AddMPOItemInput } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

const STATUS_LABEL: Record<MPOStatus, string> = {
  DRAFT: 'Nháp',
  ORDERED: 'Đã đặt hàng',
  RECEIVED: 'Đã nhận hàng',
  CANCELLED: 'Đã huỷ',
}

const STATUS_CLASS: Record<MPOStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  ORDERED: 'bg-blue-100 text-blue-800 border-blue-200',
  RECEIVED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// ── Add Item Dialog ───────────────────────────────────────────────────────────

interface AddItemDialogProps {
  poId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AddItemDialog({ poId, open, onOpenChange }: AddItemDialogProps) {
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [lengthMm, setLengthMm] = useState('')
  const [widthMm, setWidthMm] = useState('')
  const [unitCostAmount, setUnitCostAmount] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: materialsData, isLoading: loadingMaterials } = useMaterials({ limit: 200 })
  const materials = materialsData?.items ?? []
  const selectedMaterial = materials.find((m) => m.id === materialId)

  const { mutate, isPending } = useAddMPOItem()

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!materialId) next.materialId = 'Chọn vật liệu'
    const qty = Number(quantity)
    if (!quantity || qty <= 0) next.quantity = 'Số lượng phải > 0'
    const len = Number(lengthMm)
    if (!lengthMm || len <= 0) next.lengthMm = 'Chiều dài phải > 0'
    const w = Number(widthMm)
    if (!widthMm || w <= 0) next.widthMm = 'Chiều rộng phải > 0'
    const cost = Number(unitCostAmount)
    if (!unitCostAmount || cost <= 0) next.unitCostAmount = 'Đơn giá phải > 0'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate() || !selectedMaterial) return
    const input: AddMPOItemInput = {
      material_id: materialId,
      material_type: selectedMaterial.type,
      quantity: Number(quantity),
      length_mm: Number(lengthMm),
      width_mm: Number(widthMm),
      unit_cost: { amount: Number(unitCostAmount), currency: 'VND' },
    }
    mutate({ id: poId, input }, {
      onSuccess: () => {
        onOpenChange(false)
        setMaterialId('')
        setQuantity('')
        setLengthMm('')
        setWidthMm('')
        setUnitCostAmount('')
        setErrors({})
      },
    })
  }

  function handleClose() {
    onOpenChange(false)
    setMaterialId('')
    setQuantity('')
    setLengthMm('')
    setWidthMm('')
    setUnitCostAmount('')
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm dòng hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Vật liệu *</Label>
            <Select value={materialId} onValueChange={setMaterialId} disabled={loadingMaterials}>
              <SelectTrigger>
                <SelectValue placeholder={loadingMaterials ? 'Đang tải…' : '— Chọn vật liệu —'} />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.materialId && <p className="text-xs text-destructive">{errors.materialId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-length">Chiều dài (mm) *</Label>
              <Input
                id="item-length"
                type="number"
                min={1}
                value={lengthMm}
                onChange={(e) => setLengthMm(e.target.value)}
                placeholder="2440"
              />
              {errors.lengthMm && <p className="text-xs text-destructive">{errors.lengthMm}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-width">Chiều rộng (mm) *</Label>
              <Input
                id="item-width"
                type="number"
                min={1}
                value={widthMm}
                onChange={(e) => setWidthMm(e.target.value)}
                placeholder="1220"
              />
              {errors.widthMm && <p className="text-xs text-destructive">{errors.widthMm}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-qty">Số lượng tấm *</Label>
              <Input
                id="item-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-cost">Đơn giá (VND) *</Label>
              <Input
                id="item-cost"
                type="number"
                min={1}
                value={unitCostAmount}
                onChange={(e) => setUnitCostAmount(e.target.value)}
                placeholder="500000"
              />
              {errors.unitCostAmount && <p className="text-xs text-destructive">{errors.unitCostAmount}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang thêm…' : 'Thêm dòng hàng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail content ────────────────────────────────────────────────────────────

function PurchasingDetail({ id }: { id: string }) {
  const role = useCurrentRole()
  const canManage = can(role, 'create', 'purchasing')
  const canCancel = can(role, 'cancel', 'purchasing')

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [confirmOrder, setConfirmOrder] = useState(false)
  const [confirmReceive, setConfirmReceive] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  const { data: po, isLoading, isError } = useMPO(id)
  const { mutate: orderMPO, isPending: ordering } = useOrderMPO()
  const { mutate: receiveMPO, isPending: receiving } = useReceiveMPO()
  const { mutate: cancelMPO, isPending: cancelling } = useCancelMPO()
  const { mutate: removeItem, isPending: removingItem } = useRemoveMPOItem()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (isError || !po) {
    return <p className="text-sm text-destructive">Không thể tải thông tin đơn nhập.</p>
  }

  const items = po.items ?? []
  const isDraft = po.status === 'DRAFT'
  const isOrdered = po.status === 'ORDERED'
  const isTerminal = po.status === 'RECEIVED' || po.status === 'CANCELLED'

  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mã đơn</p>
            <p className="font-mono text-lg font-bold">{po.code}</p>
          </div>
          <Badge variant="outline" className={STATUS_CLASS[po.status]}>
            {STATUS_LABEL[po.status]}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Nhà cung cấp" value={po.supplier ?? '—'} />
          <Field label="Ngày tạo" value={formatDate(po.created_at)} />
          {po.ordered_at && <Field label="Ngày đặt hàng" value={formatDate(po.ordered_at)} />}
          {po.received_at && <Field label="Ngày nhận hàng" value={formatDate(po.received_at)} />}
          {po.note && <Field label="Ghi chú" value={po.note} />}
        </div>

        {/* Action buttons */}
        {!isTerminal && (
          <div className="mt-6 flex flex-wrap gap-2">
            {isDraft && canManage && (
              <Button onClick={() => setConfirmOrder(true)}>
                Xác nhận đặt hàng
              </Button>
            )}
            {isOrdered && canManage && (
              <Button onClick={() => setConfirmReceive(true)}>
                Xác nhận nhận hàng
              </Button>
            )}
            {(isDraft || isOrdered) && canCancel && (
              <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                Huỷ đơn
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Dòng hàng ({items.length})</h2>
          {isDraft && canManage && (
            <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
              <Plus className="size-4" />
              Thêm dòng hàng
            </Button>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vật liệu</TableHead>
                <TableHead>Kích thước</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
                {isDraft && canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDraft && canManage ? 6 : 5} className="py-8 text-center text-muted-foreground">
                    Chưa có dòng hàng nào.
                    {isDraft && canManage && ' Nhấn "Thêm dòng hàng" để bắt đầu.'}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm font-medium">
                      {item.material_id.slice(0, 8).toUpperCase()}
                      <span className="ml-1 text-xs text-muted-foreground">({item.material_type})</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.length_mm} × {item.width_mm} mm
                    </TableCell>
                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm">
                      {item.unit_cost.amount.toLocaleString('vi-VN')} {item.unit_cost.currency}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {item.total_cost.amount.toLocaleString('vi-VN')} {item.total_cost.currency}
                    </TableCell>
                    {isDraft && canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemovingItemId(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialogs */}
      {isDraft && canManage && (
        <AddItemDialog poId={id} open={addItemOpen} onOpenChange={setAddItemOpen} />
      )}

      <ConfirmModal
        open={confirmOrder}
        title="Xác nhận đặt hàng?"
        description={`Đơn nhập "${po.code}" sẽ chuyển sang trạng thái Đã đặt hàng. Không thể thêm/xoá dòng hàng sau khi xác nhận.`}
        confirmLabel="Xác nhận đặt hàng"
        isPending={ordering}
        onConfirm={() => orderMPO(id, { onSuccess: () => setConfirmOrder(false) })}
        onCancel={() => setConfirmOrder(false)}
      />

      <ConfirmModal
        open={confirmReceive}
        title="Xác nhận nhận hàng?"
        description={`Đơn nhập "${po.code}" sẽ chuyển sang Đã nhận hàng. Hệ thống sẽ tự động tạo lô vật liệu trong kho.`}
        confirmLabel="Xác nhận nhận hàng"
        isPending={receiving}
        onConfirm={() => receiveMPO(id, { onSuccess: () => setConfirmReceive(false) })}
        onCancel={() => setConfirmReceive(false)}
      />

      <ConfirmModal
        open={confirmCancel}
        title="Huỷ đơn nhập?"
        description={`Đơn nhập "${po.code}" sẽ bị huỷ và không thể khôi phục.`}
        confirmLabel="Huỷ đơn"
        confirmVariant="destructive"
        isPending={cancelling}
        onConfirm={() => cancelMPO(id, { onSuccess: () => setConfirmCancel(false) })}
        onCancel={() => setConfirmCancel(false)}
      />

      <ConfirmModal
        open={!!removingItemId}
        title="Xoá dòng hàng?"
        description="Dòng hàng này sẽ bị xoá khỏi đơn nhập."
        confirmLabel="Xoá"
        confirmVariant="destructive"
        isPending={removingItem}
        onConfirm={() => {
          if (!removingItemId) return
          removeItem({ id, itemId: removingItemId }, { onSuccess: () => setRemovingItemId(null) })
        }}
        onCancel={() => setRemovingItemId(null)}
      />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function PurchasingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchasing">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <Truck className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Chi tiết đơn nhập vật liệu</h1>
      </div>
      <PurchasingDetail id={id} />
    </div>
  )
}
