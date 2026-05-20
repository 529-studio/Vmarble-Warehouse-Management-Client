'use client'

import { Suspense, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Truck, Plus } from 'lucide-react'
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
import { DataPagination } from '@/components/ui/data-pagination'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { useMPOs, useCreateMPO } from '@/lib/hooks/use-purchasing'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import {
  DateRangeFilter,
  defaultFromIso,
  isoToday,
} from '@/components/dashboard/date-range-filter'
import type { MPOStatus, CreateMPOInput } from '@/types/api'

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

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
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

// ── Create Dialog ─────────────────────────────────────────────────────────────

interface CreateMPODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateMPODialog({ open, onOpenChange }: CreateMPODialogProps) {
  const [code, setCode] = useState('')
  const [supplier, setSupplier] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate, isPending } = useCreateMPO()

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!code.trim()) next.code = 'Nhập mã đơn nhập'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const input: CreateMPOInput = {
      code: code.trim(),
      ...(supplier.trim() ? { supplier: supplier.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    mutate(input, {
      onSuccess: () => {
        onOpenChange(false)
        setCode('')
        setSupplier('')
        setNote('')
        setErrors({})
      },
    })
  }

  function handleClose() {
    onOpenChange(false)
    setCode('')
    setSupplier('')
    setNote('')
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo đơn nhập vật liệu mới</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="mpo-code">Mã đơn nhập *</Label>
            <Input
              id="mpo-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="vd: MPO-2026-001"
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="mpo-supplier">Nhà cung cấp</Label>
            <Input
              id="mpo-supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Tên nhà cung cấp"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="mpo-note">Ghi chú</Label>
            <Input
              id="mpo-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú thêm (tuỳ chọn)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Huỷ</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo đơn nhập'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function PurchasingContent() {
  const role = useCurrentRole()
  const canCreate = can(role, 'create', 'purchasing')

  const [statusFilter, setStatusFilter] = useState<MPOStatus | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const { page, limit, setPage, getParam, setParams } = usePageParams(15)

  const dateFrom = getParam('from') ?? defaultFromIso()
  const dateTo = getParam('to') ?? isoToday()

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    from: dateFrom,
    to: dateTo,
    page,
    limit,
  }

  const { data, isLoading, isFetching, isError } = useMPOs(filter)
  const orders = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as MPOStatus | 'ALL'); setPage(1) }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              {(Object.keys(STATUS_LABEL) as MPOStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onChange={({ from, to }) => setParams({ from, to })}
          />
        </div>

        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo đơn nhập mới
          </Button>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Đơn nhập vật liệu (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách đơn nhập.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Chưa có đơn nhập nào.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono font-medium text-sm">
                      <Link href={`/purchasing/${po.id}`} className="hover:underline">
                        {po.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {po.supplier ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_CLASS[po.status]}>
                        {STATUS_LABEL[po.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(po.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/purchasing/${po.id}`}>Chi tiết</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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

      {canCreate && <CreateMPODialog open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function PurchasingPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Truck className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Đơn nhập vật liệu</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <PurchasingContent />
      </Suspense>
    </div>
  )
}
