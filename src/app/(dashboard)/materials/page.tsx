'use client'

import { Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMaterials, useCreateMaterial } from '@/lib/hooks/use-materials'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { CreateMaterialInput } from '@/types/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const MATERIAL_TYPES = ['PLYWOOD', 'GLUE', 'METAL', 'OTHER'] as const
type MaterialTypeValue = typeof MATERIAL_TYPES[number]

const TYPE_LABELS: Record<MaterialTypeValue, string> = {
  PLYWOOD: 'Ván ép',
  GLUE: 'Keo',
  METAL: 'Kim loại',
  OTHER: 'Khác',
}

const TYPE_BADGE_VARIANT: Record<MaterialTypeValue, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PLYWOOD: 'default',
  GLUE: 'secondary',
  METAL: 'outline',
  OTHER: 'outline',
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 4 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateMaterialDialog({ open, onOpenChange }: CreateDialogProps) {
  const [form, setForm] = useState<CreateMaterialInput>({
    type: 'PLYWOOD',
    name: '',
    unit: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateMaterialInput, string>>>({})

  const { mutate, isPending } = useCreateMaterial()

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.type) next.type = 'Vui lòng chọn loại nguyên liệu'
    if (!form.name.trim()) next.name = 'Tên không được để trống'
    if (!form.unit.trim()) next.unit = 'Đơn vị không được để trống'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    mutate(
      { type: form.type, name: form.name.trim(), unit: form.unit.trim() },
      {
        onSuccess: () => {
          toast.success('Tạo nguyên liệu thành công')
          onOpenChange(false)
          setForm({ type: 'PLYWOOD', name: '', unit: '' })
          setErrors({})
        },
        onError: (err) => {
          toast.error(mapApiErrorVi(err, 'Tạo vật liệu thất bại, thử lại'))
        },
      },
    )
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setForm({ type: 'PLYWOOD', name: '', unit: '' })
      setErrors({})
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo nguyên liệu mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="mat-type">Loại nguyên liệu *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => {
                setForm((f) => ({ ...f, type: v as MaterialTypeValue }))
                setErrors((e) => ({ ...e, type: undefined }))
              }}
            >
              <SelectTrigger id="mat-type">
                <SelectValue placeholder="Chọn loại…" />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="mat-name">Tên nguyên liệu *</Label>
            <Input
              id="mat-name"
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }))
                setErrors((err) => ({ ...err, name: undefined }))
              }}
              placeholder="VD: Ván ép 18mm Birch"
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Unit */}
          <div className="space-y-1.5">
            <Label htmlFor="mat-unit">Đơn vị *</Label>
            <Input
              id="mat-unit"
              value={form.unit}
              onChange={(e) => {
                setForm((f) => ({ ...f, unit: e.target.value }))
                setErrors((err) => ({ ...err, unit: undefined }))
              }}
              placeholder="VD: tấm, kg, lít…"
              autoComplete="off"
            />
            {errors.unit && (
              <p className="text-xs text-destructive">{errors.unit}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo nguyên liệu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main content (inside Suspense — uses useSearchParams) ─────────────────────

function MaterialsContent() {
  const { page, search, limit, setPage, setSearch } = usePageParams(10)

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)

  // Sync debounced input → URL only when the value actually changes from what
  // is already in the URL. Excluding setSearch from deps is intentional:
  // setSearch recreates on every router.push (searchParams changes), so
  // including it would create an infinite loop:
  //   effect → setSearch → router.push → searchParams → new setSearch → effect…
  useEffect(() => {
    if (debouncedSearch !== search) {
      setSearch(debouncedSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, isFetching, isError } = useMaterials({
    page,
    limit,
    search: debouncedSearch || undefined,
  })

  const isPending = isFetching && inputValue !== debouncedSearch

  const materials = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={inputValue}
          onChange={(v) => { setInputValue(v) }}
          isPending={isPending}
          placeholder="Tìm theo tên nguyên liệu…"
          containerClassName="w-full sm:max-w-sm"
        />
        <Button
          className="sm:ml-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Tạo nguyên liệu
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách nguyên liệu.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Đang tải…' : `Tất cả nguyên liệu (${totalItems})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={limit} />
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      {debouncedSearch
                        ? `Không tìm thấy nguyên liệu cho "${debouncedSearch}"`
                        : 'Chưa có nguyên liệu nào. Nhấn "Tạo nguyên liệu" để bắt đầu.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((m) => (
                    <TableRow
                      key={m.id}
                      className={isFetching ? 'opacity-60 transition-opacity' : ''}
                    >
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>
                        <Badge variant={TYPE_BADGE_VARIANT[m.type as MaterialTypeValue] ?? 'outline'}>
                          {TYPE_LABELS[m.type as MaterialTypeValue] ?? m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString('vi-VN')}
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

      <CreateMaterialDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Nguyên liệu</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <MaterialsContent />
      </Suspense>
    </div>
  )
}
