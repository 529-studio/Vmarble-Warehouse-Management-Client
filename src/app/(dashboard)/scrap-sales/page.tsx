'use client'

import { Suspense, useMemo, useState, useSyncExternalStore } from 'react'
import { Plus, Recycle } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import {
  DateRangeFilter,
  defaultFromIso,
  isoToday,
} from '@/components/dashboard/date-range-filter'
import { mapApiErrorVi } from '@/lib/api/client'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { formatVND } from '@/lib/format'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useCreateScrapSale, useScrapSales } from '@/lib/hooks/use-scrap-sales'
import type { CreateScrapSaleInput, Material, ScrapSale } from '@/types/api'

const ALL_MATERIALS = '__all__'

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatKg(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

// ── Money input — keeps a raw integer in state, displays vi-VN thousand seps.

interface MoneyInputProps {
  id: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  ariaInvalid?: boolean
}

function MoneyInput({ id, value, onChange, placeholder, ariaInvalid }: MoneyInputProps) {
  const display = value > 0 ? value.toLocaleString('vi-VN') : ''
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        aria-invalid={ariaInvalid || undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          onChange(digits ? Number(digits) : 0)
        }}
        className="pr-12"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        VND
      </span>
    </div>
  )
}

// ── Create modal ────────────────────────────────────────────────────────────

interface CreateScrapSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: Material[]
}

function CreateScrapSaleDialog({
  open,
  onOpenChange,
  materials,
}: CreateScrapSaleDialogProps) {
  const today = isoToday()
  const [materialId, setMaterialId] = useState('')
  const [saleDate, setSaleDate] = useState(today)
  const [quantityKg, setQuantityKg] = useState('')
  const [unitPrice, setUnitPrice] = useState(0)
  const [buyerName, setBuyerName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate, isPending } = useCreateScrapSale()

  const qtyNumber = quantityKg ? Number(quantityKg) : 0
  const totalAmount = qtyNumber > 0 && unitPrice > 0 ? qtyNumber * unitPrice : 0

  function reset() {
    setMaterialId('')
    setSaleDate(today)
    setQuantityKg('')
    setUnitPrice(0)
    setBuyerName('')
    setInvoiceNumber('')
    setNotes('')
    setErrors({})
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!materialId) next.material_id = 'Chọn vật liệu'
    if (!saleDate) next.sale_date = 'Nhập ngày bán'
    else if (saleDate > today) next.sale_date = 'Ngày bán không được ở tương lai'
    if (!qtyNumber || qtyNumber <= 0) next.quantity_kg = 'Khối lượng phải lớn hơn 0'
    if (!unitPrice || unitPrice <= 0) next.unit_price = 'Đơn giá phải lớn hơn 0'
    if (!buyerName.trim()) next.buyer_name = 'Nhập tên người mua'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: CreateScrapSaleInput = {
      material_id: materialId,
      sale_date: saleDate,
      quantity_kg: qtyNumber,
      unit_price: unitPrice,
      currency: 'VND',
      buyer_name: buyerName.trim(),
      ...(invoiceNumber.trim() ? { invoice_number: invoiceNumber.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }
    mutate(input, {
      onSuccess: () => {
        onOpenChange(false)
        reset()
      },
    })
  }

  function handleClose(next: boolean) {
    onOpenChange(next)
    if (!next) reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ghi nhận lượt bán phế liệu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ss-material">Vật liệu *</Label>
            <Select value={materialId} onValueChange={(v) => setMaterialId(v)}>
              <SelectTrigger id="ss-material" aria-invalid={!!errors.material_id}>
                <SelectValue placeholder="Chọn vật liệu" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.material_id && (
              <p className="text-xs text-destructive">{errors.material_id}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ss-date">Ngày bán *</Label>
              <Input
                id="ss-date"
                type="date"
                value={saleDate}
                max={today}
                aria-invalid={!!errors.sale_date}
                onChange={(e) => setSaleDate(e.target.value)}
              />
              {errors.sale_date && (
                <p className="text-xs text-destructive">{errors.sale_date}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ss-qty">Khối lượng (kg) *</Label>
              <Input
                id="ss-qty"
                inputMode="decimal"
                value={quantityKg}
                placeholder="0"
                aria-invalid={!!errors.quantity_kg}
                onChange={(e) => {
                  // Allow digits + a single decimal point.
                  const v = e.target.value.replace(/[^\d.]/g, '')
                  const parts = v.split('.')
                  setQuantityKg(
                    parts.length > 1
                      ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
                      : v,
                  )
                }}
              />
              {errors.quantity_kg && (
                <p className="text-xs text-destructive">{errors.quantity_kg}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ss-price">Đơn giá / kg *</Label>
              <MoneyInput
                id="ss-price"
                value={unitPrice}
                onChange={setUnitPrice}
                placeholder="0"
                ariaInvalid={!!errors.unit_price}
              />
              {errors.unit_price && (
                <p className="text-xs text-destructive">{errors.unit_price}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Thành tiền (tự tính)</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
                {totalAmount > 0 ? formatVND(totalAmount) : '—'}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="ss-buyer">Người mua *</Label>
            <Input
              id="ss-buyer"
              value={buyerName}
              placeholder="Tên người mua / công ty"
              aria-invalid={!!errors.buyer_name}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            {errors.buyer_name && (
              <p className="text-xs text-destructive">{errors.buyer_name}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ss-invoice">Số hoá đơn</Label>
            <Input
              id="ss-invoice"
              value={invoiceNumber}
              placeholder="HD-..."
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ss-notes">Ghi chú</Label>
            <Textarea
              id="ss-notes"
              rows={2}
              value={notes}
              placeholder="Tuỳ chọn"
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page content ────────────────────────────────────────────────────────────

function ScrapSalesContent() {
  const role = useCurrentRole()
  const canRead = can(role, 'read', 'scrap_sales')
  const canCreate = can(role, 'create', 'scrap_sales')

  const [from, setFrom] = useState(defaultFromIso())
  const [to, setTo] = useState(isoToday())
  const [materialId, setMaterialId] = useState(ALL_MATERIALS)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: materialsData } = useMaterials({ limit: 200 })
  const materials = useMemo(() => materialsData?.items ?? [], [materialsData?.items])

  const filter = useMemo(
    () => ({
      from,
      to,
      ...(materialId !== ALL_MATERIALS ? { material_id: materialId } : {}),
      limit: 50,
    }),
    [from, to, materialId],
  )

  const list = useScrapSales(canRead ? filter : {})

  const sales = list.items as ScrapSale[]
  const totalRevenue = useMemo(
    () => sales.reduce((acc, row) => acc + (row.total_amount ?? 0), 0),
    [sales],
  )
  const totalQtyKg = useMemo(
    () => sales.reduce((acc, row) => acc + (row.quantity_kg ?? 0), 0),
    [sales],
  )

  const materialName = useMemo(() => {
    const map = new Map(materials.map((m) => [m.id, m.name]))
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [materials])

  if (!canRead) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
        Bạn không có quyền xem trang này.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter from={from} to={to} onChange={(r) => { setFrom(r.from); setTo(r.to) }} />
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MATERIALS}>Tất cả vật liệu</SelectItem>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({m.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Ghi nhận lượt bán
          </Button>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${list.isFetching && !list.isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {list.isLoading ? 'Đang tải…' : `Lượt bán phế liệu (${sales.length})`}
        </div>

        {list.isError ? (
          <p className="p-4 text-sm text-destructive">
            {mapApiErrorVi(list.error, 'Không thể tải danh sách bán phế liệu.')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày bán</TableHead>
                <TableHead>Vật liệu</TableHead>
                <TableHead className="text-right">Khối lượng (kg)</TableHead>
                <TableHead className="text-right">Đơn giá / kg</TableHead>
                <TableHead className="text-right">Thành tiền</TableHead>
                <TableHead>Người mua</TableHead>
                <TableHead>Số hoá đơn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Chưa có lượt bán phế liệu nào trong khoảng thời gian này.
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.sale_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {materialName(row.material_id)}
                    </TableCell>
                    <TableCell className="text-right">{formatKg(row.quantity_kg)}</TableCell>
                    <TableCell className="text-right">{formatVND(row.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatVND(row.total_amount)}
                    </TableCell>
                    <TableCell>{row.buyer_name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.invoice_number ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Footer aggregate — sum across loaded pages. */}
        {!list.isLoading && !list.isError && sales.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t bg-muted/20 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Tổng khối lượng: <span className="font-medium text-foreground">{formatKg(totalQtyKg)} kg</span>
            </span>
            <span className="text-muted-foreground">
              Tổng doanh thu: <span className="font-semibold text-emerald-700">{formatVND(totalRevenue)}</span>
            </span>
          </div>
        )}
      </div>

      <LoadMoreButton
        hasMore={list.hasMore}
        isFetching={list.isFetchingNextPage}
        onClick={list.fetchNextPage}
        itemCount={sales.length}
      />

      {canCreate && (
        <CreateScrapSaleDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          materials={materials}
        />
      )}
    </div>
  )
}

// ── Page shell ──────────────────────────────────────────────────────────────

export default function ScrapSalesPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Recycle className="size-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold">Bán phế liệu</h1>
          <p className="text-sm text-muted-foreground">
            Ghi nhận doanh thu từ phế liệu — bù trừ chi phí hao hụt trong báo cáo (BR-C06).
          </p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <ScrapSalesContent />
      </Suspense>
    </div>
  )
}
