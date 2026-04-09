'use client'

import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, FlaskConical, Trash2, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
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
import { useSKUs, useCreateSKU, useSKUBOM, useSetSKUBOM } from '@/lib/hooks/use-skus'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { SKU, CreateSKUInput, BOMItem } from '@/types/api'

// ── Skeleton ──────────────────────────────────────────────────────────────────

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

// ── Create SKU Dialog ─────────────────────────────────────────────────────────

interface CreateSKUDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CreateFormErrors = Partial<Record<
  'code' | 'name' | 'length_mm' | 'width_mm',
  string
>>

function CreateSKUDialog({ open, onOpenChange }: CreateSKUDialogProps) {
  const [form, setForm] = useState<CreateSKUInput>({
    code: '',
    name: '',
    dimensions: { length_mm: 0, width_mm: 0 },
    requires_metal: false,
  })
  const [errors, setErrors] = useState<CreateFormErrors>({})
  const { mutate, isPending } = useCreateSKU()

  function validate(): boolean {
    const next: CreateFormErrors = {}
    if (!form.code.trim()) next.code = 'Mã sản phẩm không được để trống'
    if (!form.name.trim()) next.name = 'Tên không được để trống'
    if (!form.dimensions.length_mm || form.dimensions.length_mm <= 0)
      next.length_mm = 'Chiều dài phải lớn hơn 0'
    if (!form.dimensions.width_mm || form.dimensions.width_mm <= 0)
      next.width_mm = 'Chiều rộng phải lớn hơn 0'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutate(
      {
        code: form.code.trim(),
        name: form.name.trim(),
        dimensions: form.dimensions,
        requires_metal: form.requires_metal,
      },
      {
        onSuccess: () => {
          toast.success('Tạo sản phẩm thành công')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Tạo thất bại, thử lại')
        },
      },
    )
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setForm({ code: '', name: '', dimensions: { length_mm: 0, width_mm: 0 }, requires_metal: false })
      setErrors({})
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo sản phẩm mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="sku-code">Mã sản phẩm *</Label>
            <Input
              id="sku-code"
              value={form.code}
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value }))
                setErrors((er) => ({ ...er, code: undefined }))
              }}
              placeholder="VD: TB-001"
              autoComplete="off"
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="sku-name">Tên sản phẩm *</Label>
            <Input
              id="sku-name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setErrors((er) => ({ ...er, name: undefined }))
              }}
              placeholder="VD: Tủ bếp trên 1 cánh"
              autoComplete="off"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku-length">Dài (mm) *</Label>
              <Input
                id="sku-length"
                type="number"
                min={1}
                value={form.dimensions.length_mm || ''}
                onChange={(e) => {
                  setForm((f) => ({ ...f, dimensions: { ...f.dimensions, length_mm: Number(e.target.value) } }))
                  setErrors((er) => ({ ...er, length_mm: undefined }))
                }}
                placeholder="800"
              />
              {errors.length_mm && <p className="text-xs text-destructive">{errors.length_mm}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku-width">Rộng (mm) *</Label>
              <Input
                id="sku-width"
                type="number"
                min={1}
                value={form.dimensions.width_mm || ''}
                onChange={(e) => {
                  setForm((f) => ({ ...f, dimensions: { ...f.dimensions, width_mm: Number(e.target.value) } }))
                  setErrors((er) => ({ ...er, width_mm: undefined }))
                }}
                placeholder="600"
              />
              {errors.width_mm && <p className="text-xs text-destructive">{errors.width_mm}</p>}
            </div>
          </div>

          {/* Requires metal toggle */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.requires_metal}
              onClick={() => setForm((f) => ({ ...f, requires_metal: !f.requires_metal }))}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                form.requires_metal ? 'bg-primary' : 'bg-input',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                  form.requires_metal ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <div>
              <p className="text-sm font-medium">Yêu cầu kim loại</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo sản phẩm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── BOM Editor Dialog ─────────────────────────────────────────────────────────

interface BOMEditorDialogProps {
  sku: SKU | null
  onClose: () => void
}

interface BOMRowDraft extends BOMItem {
  _key: number
}

let _bomKeyCounter = 0

function emptyRow(): BOMRowDraft {
  return { _key: ++_bomKeyCounter, material_id: '', material_type: 'OTHER', quantity_per_unit: 1, unit: '' }
}

function BOMEditorDialog({ sku, onClose }: BOMEditorDialogProps) {
  const open = sku !== null
  const { data: bomData, isLoading: bomLoading } = useSKUBOM(sku?.id ?? null)
  const { mutate: setBOM, isPending: saving } = useSetSKUBOM(sku?.id ?? '')
  const { data: materialsData } = useMaterials()
  const materials = materialsData?.items ?? []

  const [rows, setRows] = useState<BOMRowDraft[]>([emptyRow()])
  const [validationError, setValidationError] = useState<string | null>(null)

  // Populate rows when BOM loads
  useEffect(() => {
    if (!open) return
    setValidationError(null)
    if (bomData?.components && bomData.components.length > 0) {
      setRows(bomData.components.map((c) => ({ ...c, _key: ++_bomKeyCounter })))
    } else {
      setRows([emptyRow()])
    }
  }, [bomData, open])

  function addRow() {
    setRows((r) => [...r, emptyRow()])
  }

  function removeRow(key: number) {
    setRows((r) => r.length > 1 ? r.filter((x) => x._key !== key) : r)
  }

  function updateRow(key: number, patch: Partial<BOMItem>) {
    setRows((r) => r.map((x) => x._key === key ? { ...x, ...patch } : x))
    setValidationError(null)
  }

  function handleSave() {
    const invalid = rows.some(
      (r) => !r.material_id || r.quantity_per_unit <= 0 || !r.unit.trim(),
    )
    if (invalid) {
      setValidationError('Vui lòng điền đầy đủ: nguyên liệu, số lượng > 0, và đơn vị cho mỗi dòng.')
      return
    }
    const ids = rows.map((r) => r.material_id)
    if (new Set(ids).size !== ids.length) {
      setValidationError('Mỗi nguyên liệu chỉ được xuất hiện 1 lần trong định mức. Gộp số lượng vào cùng 1 dòng.')
      return
    }
    setValidationError(null)
    setBOM(
      { components: rows.map(({ material_id, material_type, quantity_per_unit, unit }) => ({ material_id, material_type, quantity_per_unit, unit })) },
      {
        onSuccess: () => {
          toast.success('Lưu định mức thành công')
          onClose()
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Lưu thất bại')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-muted-foreground" />
            Định mức NVL — {sku?.code} · {sku?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {bomLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nguyên liệu *</TableHead>
                  <TableHead className="w-32">Số lượng *</TableHead>
                  <TableHead className="w-28">Đơn vị *</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row._key}>
                    {/* Material picker */}
                    <TableCell>
                      <select
                        value={row.material_id}
                        onChange={(e) => {
                          const selected = materials.find((m) => m.id === e.target.value)
                          updateRow(row._key, {
                            material_id: e.target.value,
                            material_type: selected?.type ?? 'OTHER',
                          })
                        }}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— Chọn nguyên liệu —</option>
                        {materials.map((m) => {
                          const usedByOther = rows.some(
                            (r) => r._key !== row._key && r.material_id === m.id,
                          )
                          return (
                            <option key={m.id} value={m.id} disabled={usedByOther}>
                              {m.name} ({m.type}){usedByOther ? ' — đã chọn' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </TableCell>

                    {/* Quantity */}
                    <TableCell>
                      <Input
                        type="number"
                        min={0.001}
                        step={0.001}
                        value={row.quantity_per_unit}
                        onChange={(e) =>
                          updateRow(row._key, { quantity_per_unit: Number(e.target.value) })
                        }
                      />
                    </TableCell>

                    {/* Unit */}
                    <TableCell>
                      <Input
                        value={row.unit}
                        onChange={(e) => updateRow(row._key, { unit: e.target.value })}
                        placeholder="tấm, kg…"
                      />
                    </TableCell>

                    {/* Remove */}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row._key)}
                        disabled={rows.length === 1}
                        aria-label="Xóa dòng"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="size-4" />
          Thêm nguyên liệu
        </Button>

        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || bomLoading}>
            {saving ? 'Đang lưu…' : 'Lưu định mức'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function SKUsContent() {
  const { page, search, limit, setPage, setSearch } = usePageParams(10)
  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)

  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const [createOpen, setCreateOpen] = useState(false)
  const [bomSKU, setBomSKU] = useState<SKU | null>(null)

  const { data, isLoading, isFetching, isError } = useSKUs({
    page,
    limit,
    search: debouncedSearch || undefined,
  })

  const isPending = isFetching && inputValue !== debouncedSearch
  const skus = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          isPending={isPending}
          placeholder="Tìm theo mã hoặc tên sản phẩm…"
          containerClassName="w-full sm:max-w-sm"
        />
        <Button className="sm:ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Tạo sản phẩm
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách sản phẩm.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Đang tải…' : `Tất cả sản phẩm (${totalItems})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã sản phẩm</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Kích thước (mm)</TableHead>
                  <TableHead>Kim loại</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead className="w-20 text-right">Định mức NVL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={limit} cols={6} />
                ) : skus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {debouncedSearch
                        ? `Không tìm thấy sản phẩm cho "${debouncedSearch}"`
                        : 'Chưa có sản phẩm nào. Nhấn "Tạo sản phẩm" để bắt đầu.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  skus.map((sku) => (
                    <TableRow
                      key={sku.id}
                      className={isFetching ? 'opacity-60 transition-opacity' : ''}
                    >
                      <TableCell className="font-mono font-medium">{sku.code}</TableCell>
                      <TableCell>{sku.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {sku.dimensions.length_mm} × {sku.dimensions.width_mm}
                      </TableCell>
                      <TableCell>
                        {sku.requires_metal ? (
                          <Badge variant="destructive" className="gap-1">
                            <Wrench className="size-3" />
                            Cần kim loại
                          </Badge>
                        ) : (
                          <Badge variant="outline">Không</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sku.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setBomSKU(sku)}
                          aria-label={`Chỉnh định mức NVL cho ${sku.code}`}
                          title="Chỉnh sửa định mức NVL"
                        >
                          <Pencil className="size-4" />
                        </Button>
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

      <CreateSKUDialog open={createOpen} onOpenChange={setCreateOpen} />
      <BOMEditorDialog sku={bomSKU} onClose={() => setBomSKU(null)} />
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function SKUsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Sản phẩm</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <SKUsContent />
      </Suspense>
    </div>
  )
}
