'use client'

import { Suspense, useMemo, useSyncExternalStore, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataPagination } from '@/components/ui/data-pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mapApiErrorVi } from '@/lib/api/client'
import { usePOs, useCreatePO } from '@/lib/hooks/use-pos'
import { useSKUs } from '@/lib/hooks/use-skus'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { ExportExcelButton } from '@/components/dashboard/export-excel-button'
import {
  DateRangeFilter,
  defaultFromIso,
  isoToday,
} from '@/components/dashboard/date-range-filter'
import type { CreatePOInput, CreateLineItemInput, SKU } from '@/types/api'

// ── Helpers

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ── Helpers — price formatting ────────────────────────────────────────────────

/** Format a number with thousand-separators: 1500000 → "1,500,000" */
function formatPrice(amount: number): string {
  if (!amount) return ''
  return amount.toLocaleString('en-US')
}

/** Parse a formatted price string back to a number: "1,500,000" → 1500000 */
function parsePrice(raw: string): number {
  const n = Number(raw.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

// ── Line item row draft ───────────────────────────────────────────────────────

interface LineItemDraft extends CreateLineItemInput {
  _key: number
  /** Display string for the price input — keeps formatted value while user types */
  _priceDisplay: string
}

let _keyCounter = 0
function emptyLine(): LineItemDraft {
  return { _key: ++_keyCounter, sku_id: '', quantity: 1, selling_price: { amount: 0, currency: 'VND' }, _priceDisplay: '' }
}

// ── Create PO Dialog ──────────────────────────────────────────────────────────

interface CreatePODialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

type FormErrors = Partial<Record<'code' | 'expected_delivery', string>>
type RowErrors = Record<number, { sku_id?: string; quantity?: string; price?: string }>

function CreatePODialog({ open, onOpenChange }: CreatePODialogProps) {
  const [code, setCode] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [lines, setLines] = useState<LineItemDraft[]>([emptyLine()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [rowErrors, setRowErrors] = useState<RowErrors>({})

  const { mutate, isPending } = useCreatePO()
  // Load all SKUs for the picker (no pagination — catalog is small)
  const { data: skusData } = useSKUs({ limit: 200 })
  const skus: SKU[] = skusData?.items ?? []

  function reset() {
    setCode('')
    setExpectedDelivery('')
    setLines([emptyLine()])
    setErrors({})
    setRowErrors({})
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function addLine() {
    setLines((l) => [...l, emptyLine()])
  }

  function removeLine(key: number) {
    setLines((l) => l.length > 1 ? l.filter((x) => x._key !== key) : l)
  }

  function updateLine(key: number, patch: Partial<LineItemDraft>) {
    setLines((l) => l.map((x) => x._key === key ? { ...x, ...patch } : x))
    setRowErrors((e) => ({ ...e, [key]: {} }))
  }

  function handlePriceInput(key: number, raw: string) {
    // Allow only digits and commas while typing; reformat on each keystroke
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    const amount = Number(digitsOnly)
    const display = digitsOnly ? Number(digitsOnly).toLocaleString('en-US') : ''
    updateLine(key, { selling_price: { amount, currency: 'VND' }, _priceDisplay: display })
  }

  function validate(): boolean {
    const nextForm: FormErrors = {}
    const nextRows: RowErrors = {}

    if (!code.trim()) nextForm.code = 'Mã PO không được để trống'
    if (!expectedDelivery) nextForm.expected_delivery = 'Chọn ngày giao hàng dự kiến'

    const seenSkus = new Set<string>()
    for (const l of lines) {
      const rowErr: RowErrors[number] = {}
      if (!l.sku_id) rowErr.sku_id = 'Chọn sản phẩm'
      else if (seenSkus.has(l.sku_id)) rowErr.sku_id = 'Sản phẩm đã được chọn ở dòng khác'
      if (l.sku_id) seenSkus.add(l.sku_id)
      if (l.quantity < 1) rowErr.quantity = 'SL ≥ 1'
      if (l.selling_price.amount <= 0) rowErr.price = 'Đơn giá > 0'
      if (Object.keys(rowErr).length) nextRows[l._key] = rowErr
    }

    setErrors(nextForm)
    setRowErrors(nextRows)
    return Object.keys(nextForm).length === 0 && Object.keys(nextRows).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: CreatePOInput = {
      code: code.trim(),
      expected_delivery: new Date(expectedDelivery).toISOString(),
      line_items: lines.map(({ sku_id, quantity, selling_price }) => ({
        sku_id,
        quantity,
        selling_price,
      })),
    }
    mutate(input, {
      onSuccess: () => {
        toast.success(`Tạo đơn hàng ${input.code} thành công`)
        handleOpenChange(false)
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Tạo đơn hàng thất bại, thử lại'))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo đơn hàng mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="po-code">Mã PO *</Label>
              <Input
                id="po-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setErrors((er) => ({ ...er, code: undefined }))
                }}
                placeholder="VD: PO-2026-001"
                autoComplete="off"
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-delivery">Ngày giao dự kiến *</Label>
              <Input
                id="po-delivery"
                type="date"
                value={expectedDelivery}
                onChange={(e) => {
                  setExpectedDelivery(e.target.value)
                  setErrors((er) => ({ ...er, expected_delivery: undefined }))
                }}
              />
              {errors.expected_delivery && (
                <p className="text-xs text-destructive">{errors.expected_delivery}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <Label>Danh sách sản phẩm *</Label>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="w-24">SL</TableHead>
                    <TableHead className="w-36">Đơn giá (VND)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const usedSkuIds = new Set(
                      lines.filter((l) => l._key !== line._key).map((l) => l.sku_id),
                    )
                    const re = rowErrors[line._key] ?? {}
                    return (
                      <TableRow key={line._key}>
                        {/* SKU picker */}
                        <TableCell>
                          <select
                            value={line.sku_id}
                            onChange={(e) => updateLine(line._key, { sku_id: e.target.value })}
                            className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${re.sku_id ? 'border-destructive' : 'border-input'}`}
                          >
                            <option value="">— Chọn sản phẩm —</option>
                            {skus.map((s) => (
                              <option
                                key={s.id}
                                value={s.id}
                                disabled={usedSkuIds.has(s.id)}
                              >
                                {s.code} — {s.name}{usedSkuIds.has(s.id) ? ' (đã chọn)' : ''}
                              </option>
                            ))}
                          </select>
                          {re.sku_id && <p className="mt-1 text-xs text-destructive">{re.sku_id}</p>}
                        </TableCell>

                        {/* Quantity */}
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line._key, { quantity: Number(e.target.value) })
                            }
                            className={re.quantity ? 'border-destructive' : ''}
                          />
                          {re.quantity && <p className="mt-1 text-xs text-destructive">{re.quantity}</p>}
                        </TableCell>

                        {/* Price — text input with comma formatting */}
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={line._priceDisplay}
                            onChange={(e) => handlePriceInput(line._key, e.target.value)}
                            onBlur={() => {
                              // Reformat on blur to clean up partial input
                              const display = line.selling_price.amount
                                ? formatPrice(line.selling_price.amount)
                                : ''
                              updateLine(line._key, { _priceDisplay: display })
                            }}
                            placeholder="1,500,000"
                            className={re.price ? 'border-destructive' : ''}
                          />
                          {re.price && <p className="mt-1 text-xs text-destructive">{re.price}</p>}
                        </TableCell>

                        {/* Remove */}
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeLine(line._key)}
                            disabled={lines.length === 1}
                            aria-label="Xóa dòng"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addLine} className="w-fit">
              <Plus className="size-4" />
              Thêm sản phẩm
            </Button>

          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo đơn hàng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── PO list content ───────────────────────────────────────────────────────────

function POsContent() {
  const role = useCurrentRole()
  const canCreatePO = can(role, 'create', 'pos')

  const { page, limit, setPage, getParam, setParams } = usePageParams(10)
  const [createOpen, setCreateOpen] = useState(false)
  const router = useRouter()

  const dateFrom = getParam('from') ?? defaultFromIso()
  const dateTo = getParam('to') ?? isoToday()

  const { data, isLoading, isFetching, isError } = usePOs({ page, limit, from: dateFrom, to: dateTo })

  const pos = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onChange={({ from, to }) => setParams({ from, to })}
        />
        <ExportExcelButton report="purchase-orders" className="ml-auto" />
        {canCreatePO ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo đơn hàng
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Bạn chỉ có quyền xem danh sách đơn hàng.</p>
        )}
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách đơn hàng.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Đang tải…' : `Tất cả đơn hàng (${totalItems})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã PO</TableHead>
                  <TableHead>Ngày giao dự kiến</TableHead>
                  <TableHead className="text-right">Số sản phẩm</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={limit} cols={5} />
                ) : pos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                      Chưa có đơn hàng nào. Nhấn &quot;Tạo đơn hàng&quot; để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po) => (
                    <TableRow
                      key={po.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isFetching ? 'opacity-60' : ''}`}
                      onClick={() => router.push(`/pos/${po.id}`)}
                    >
                      <TableCell className="font-mono font-medium">{po.code}</TableCell>
                      <TableCell>{formatDate(po.expected_delivery)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {po.line_items?.length ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(po.created_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        Xem chi tiết →
                      </TableCell>
                    </TableRow>
                  ))
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

      {canCreatePO && <CreatePODialog open={createOpen} onOpenChange={setCreateOpen} />}
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function POsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ShoppingCart className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Đơn hàng</h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <POsContent />
      </Suspense>
    </div>
  )
}
