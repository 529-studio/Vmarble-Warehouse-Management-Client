'use client'

import { Suspense, useState, useSyncExternalStore } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
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
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import {
  useSalesOrder,
  useConfirmSalesOrder,
  useCancelSalesOrder,
} from '@/lib/hooks/use-sales-orders'
import type { SalesOrder } from '@/types/api'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang sản xuất',
  PARTIALLY_SHIPPED: 'Xuất một phần',
  SHIPPED: 'Đã xuất',
  CANCELLED: 'Đã huỷ',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  DRAFT: 'secondary',
  CONFIRMED: 'default',
  IN_PRODUCTION: 'default',
  PARTIALLY_SHIPPED: 'outline',
  SHIPPED: 'outline',
  CANCELLED: 'destructive',
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMoney(amount: number, currency?: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + (currency ? ` ${currency}` : '')
}

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  )
}

function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  isPending,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận đơn hàng</DialogTitle>
          <DialogDescription>
            Đơn hàng sẽ chuyển sang trạng thái <strong>Đã xác nhận</strong>. Bạn có chắc chắn?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Huỷ
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CancelDialog({
  open,
  onCancel,
  onConfirm,
  isPending,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setReason(''); onCancel() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Huỷ đơn hàng</DialogTitle>
          <DialogDescription>
            Đơn hàng sẽ bị huỷ và không thể phục hồi. Vui lòng nhập lý do (tuỳ chọn).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Lý do huỷ</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do huỷ đơn hàng…"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setReason(''); onCancel() }} disabled={isPending}>
            Đóng
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={isPending}>
            {isPending ? 'Đang huỷ…' : 'Xác nhận huỷ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SalesOrderDetail({ id }: { id: string }) {
  const router = useRouter()
  const role = useCurrentRole()
  const canApprove = can(role, 'approve', 'sales_orders')
  const canCancel = can(role, 'cancel', 'sales_orders')

  const { data: so, isLoading, isError } = useSalesOrder(id)
  const confirmMut = useConfirmSalesOrder()
  const cancelMut = useCancelSalesOrder()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (isError || !so) {
    return (
      <p className="text-sm text-destructive">
        Không thể tải thông tin đơn hàng. Vui lòng thử lại.
      </p>
    )
  }

  const isCancellable = so.status !== 'CANCELLED' && so.status !== 'SHIPPED'
  const isConfirmable = so.status === 'DRAFT'
  const lines = so.lines ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push('/sales-orders')}
        >
          <ArrowLeft className="size-4" />
          Đơn hàng khách
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono font-semibold">{so.code}</span>
        <Badge variant={STATUS_VARIANT[so.status] ?? 'secondary'}>
          {STATUS_LABEL[so.status] ?? so.status}
        </Badge>
        <div className="ml-auto flex gap-2">
          {canApprove && isConfirmable && (
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              Xác nhận đơn hàng
            </Button>
          )}
          {canCancel && isCancellable && (
            <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
              Huỷ đơn hàng
            </Button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Khách hàng" value={so.customer_name ?? so.customer_code ?? so.customer_id} />
          <InfoRow label="Quốc gia" value={so.customer_country_code} />
          <InfoRow label="Tiền tệ" value={so.currency} />
          <InfoRow label="Incoterm" value={so.incoterm} />
          <InfoRow label="Cảng xếp hàng" value={so.port_of_loading} />
          <InfoRow label="Cảng đến" value={so.port_of_discharge} />
          <InfoRow label="Ngày xuất dự kiến" value={formatDate(so.expected_ship_date)} />
          <InfoRow label="Ngày tạo" value={formatDate(so.created_at)} />
          {so.note && (
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow label="Ghi chú" value={so.note} />
            </div>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Dòng hàng ({lines.length})</h2>
        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Chưa có dòng hàng nào.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã SKU</TableHead>
                  <TableHead className="text-right">SL đặt hàng</TableHead>
                  <TableHead className="text-right">SL kế hoạch</TableHead>
                  <TableHead className="text-right">SL đã xuất</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono text-sm">{line.sku_id}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty_ordered}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty_planned}</TableCell>
                    <TableCell className="text-right tabular-nums">{line.qty_shipped}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.unit_price
                        ? formatMoney(line.unit_price.amount, line.unit_price.currency)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          confirmMut.mutate(so.id, { onSuccess: () => setConfirmOpen(false) })
        }}
        isPending={confirmMut.isPending}
      />
      <CancelDialog
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onConfirm={(reason) => {
          cancelMut.mutate(
            { id: so.id, reason: reason || undefined },
            { onSuccess: () => setCancelOpen(false) },
          )
        }}
        isPending={cancelMut.isPending}
      />
    </div>
  )
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Chi tiết đơn hàng</h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        }
      >
        <SalesOrderDetail id={id} />
      </Suspense>
    </div>
  )
}
