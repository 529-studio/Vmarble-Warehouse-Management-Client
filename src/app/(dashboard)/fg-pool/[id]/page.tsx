'use client'

import { Suspense, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { ArrowLeft, ArrowRightLeft, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { RoleGate } from '@/components/auth/role-gate'
import { useFGPoolHistory, useFGPoolItem, useReassignFG } from '@/lib/hooks/use-packing'
import { useSalesOrders } from '@/lib/hooks/use-sales-orders'
import { ApiClientError } from '@/lib/api/client'
import type { FGPool, SalesOrderLine } from '@/types/api'

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã đặt chỗ',
  LOADED: 'Đã xếp',
  DEFECT: 'Hàng lỗi',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  AVAILABLE: 'default',
  RESERVED: 'secondary',
  LOADED: 'outline',
  DEFECT: 'destructive',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Reassign Modal ─────────────────────────────────────────────────────────────

function ReassignModal({
  fg,
  open,
  onClose,
}: {
  fg: FGPool
  open: boolean
  onClose: () => void
}) {
  const reasonId = useId()
  const [selectedLineId, setSelectedLineId] = useState('')
  const [reason, setReason] = useState('')

  const { data: soData } = useSalesOrders({ limit: 200 })
  const allLines = useMemo<SalesOrderLine[]>(() => {
    const orders = soData?.items ?? []
    return orders.flatMap((so) => (so.lines ?? []).map((l) => ({ ...l, _soCode: so.code })))
  }, [soData?.items])

  // Filter to same SKU, exclude current SOL
  const eligibleLines = useMemo(
    () => allLines.filter((l) => l.sku_id === fg.sku_id && l.id !== fg.sales_order_line_id),
    [allLines, fg.sku_id, fg.sales_order_line_id],
  )

  const reassign = useReassignFG(fg.id)

  // Reset on open
  const openKey = open ? fg.id : ''
  const [prevKey, setPrevKey] = useState(openKey)
  if (prevKey !== openKey) {
    setPrevKey(openKey)
    setSelectedLineId('')
    setReason('')
  }

  const canSubmit = selectedLineId && reason.trim().length > 0

  const submit = () => {
    if (!canSubmit || reassign.isPending) return
    reassign.mutate(
      { new_sales_order_line_id: selectedLineId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã chuyển đơn hàng thành công.')
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiClientError) {
            if (err.status === 412) {
              toast.error('Thành phẩm đã xếp container, không thể chuyển.')
              return
            }
            if (err.status === 422) {
              toast.error('SKU không khớp với dòng đơn hàng được chọn.')
              return
            }
          }
          toast.error('Không thể chuyển đơn hàng. Vui lòng thử lại.')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !reassign.isPending) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            Chuyển đơn hàng
          </DialogTitle>
          <DialogDescription>
            Thành phẩm <span className="font-mono font-semibold">{fg.barcode_code ?? fg.barcode_id}</span> · SKU{' '}
            <span className="font-mono">{fg.sku_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Dòng đơn hàng mới</Label>
            {eligibleLines.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Không có dòng đơn hàng nào cùng SKU khả dụng.
              </p>
            ) : (
              <Select
                value={selectedLineId}
                onValueChange={setSelectedLineId}
                disabled={reassign.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn dòng đơn hàng…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleLines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {(l as SalesOrderLine & { _soCode?: string })._soCode ?? l.sales_order_id} · {l.sku_id.slice(0, 8)}… · SL: {l.qty_ordered}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={reasonId}>
              Lý do <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Đơn hàng gốc đã huỷ, chuyển sang đơn thay thế."
              rows={3}
              disabled={reassign.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={reassign.isPending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!canSubmit || reassign.isPending}
          >
            {reassign.isPending ? 'Đang chuyển…' : 'Xác nhận chuyển'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Content ─────────────────────────────────────────────────────────────

function FGPoolDetail({ id }: { id: string }) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const { data: fg, isLoading, isError } = useFGPoolItem(id)
  const { data: history, isLoading: historyLoading } = useFGPoolHistory(id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (isError || !fg) {
    return (
      <p className="text-sm text-destructive">Không thể tải thông tin thành phẩm.</p>
    )
  }

  const canReassign = fg.status === 'AVAILABLE' || fg.status === 'RESERVED'

  return (
    <div className="space-y-6">
      {/* Info card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-mono text-lg font-bold">{fg.barcode_code ?? fg.barcode_id}</p>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[fg.status] ?? 'outline'}>
                  {STATUS_LABEL[fg.status] ?? fg.status}
                </Badge>
              </div>
            </div>
            <RoleGate allow={['ADMIN', 'PLANNER']}>
              {canReassign && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReassignOpen(true)}
                  className="shrink-0"
                >
                  <ArrowRightLeft className="mr-1.5 size-4" />
                  Chuyển đơn hàng
                </Button>
              )}
            </RoleGate>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Mã thành phẩm</p>
            <p className="font-mono font-semibold">{fg.sku_code}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tên sản phẩm</p>
            <p className="text-sm">{fg.sku_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lệnh sản xuất</p>
            <p className="font-mono text-sm">{fg.work_order_code ?? fg.work_order_id}</p>
          </div>
          {fg.sales_order_line_id && (
            <div>
              <p className="text-xs text-muted-foreground">Dòng đơn hàng</p>
              <p className="font-mono text-sm">{fg.sales_order_line_id}</p>
            </div>
          )}
          {fg.qc_passed_at && (
            <div>
              <p className="text-xs text-muted-foreground">QC thông qua</p>
              <p className="text-sm">{formatDate(fg.qc_passed_at)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Ngày tạo</p>
            <p className="text-sm">{formatDate(fg.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reassignment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Lịch sử chuyển đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Chưa có lịch sử chuyển đơn hàng.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dòng ĐH cũ</TableHead>
                  <TableHead>Dòng ĐH mới</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead>Người chuyển</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {h.old_sales_order_line_id ? h.old_sales_order_line_id.slice(0, 8) + '…' : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {h.new_sales_order_line_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{h.reason}</TableCell>
                    <TableCell className="text-sm">{h.reassigned_by}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(h.reassigned_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReassignModal
        fg={fg}
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FGPoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/fg-pool"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Thành phẩm chờ xuất
        </Link>
      </div>
      <h1 className="text-2xl font-bold">Chi tiết thành phẩm</h1>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        }
      >
        <FGPoolDetail id={id} />
      </Suspense>
    </div>
  )
}
