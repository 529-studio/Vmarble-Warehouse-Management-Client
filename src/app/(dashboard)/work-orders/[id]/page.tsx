'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWorkOrder, useWorkOrderConsumptions } from '@/lib/hooks/use-work-orders'
import type { WorkOrderStatus } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
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

// ── Detail content ────────────────────────────────────────────────────────────

function WorkOrderDetail({ id }: { id: string }) {
  const { data: wo, isLoading: woLoading, isError: woError } = useWorkOrder(id)
  const {
    data: consumptions,
    isLoading: consumptionsLoading,
    isError: consumptionsError,
  } = useWorkOrderConsumptions(id)

  if (woLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (woError || !wo) {
    return (
      <p className="text-sm text-destructive">
        Không thể tải thông tin lệnh sản xuất.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mã lệnh
            </p>
            <p className="font-mono text-lg font-bold">{shortId(wo.id)}</p>
          </div>
          <Badge variant="outline" className={STATUS_CLASS[wo.status]}>
            {STATUS_LABEL[wo.status]}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="SKU" value={wo.sku_code ?? wo.sku_id.slice(0, 8)} />
          <Field
            label="Kế hoạch"
            value={
              <Link
                href={`/plans/${wo.plan_id}`}
                className="font-mono hover:underline"
              >
                {shortId(wo.plan_id)}
              </Link>
            }
          />
          <Field label="Số lượng" value={wo.quantity.toString()} />
          {wo.dimensions && (
            <Field
              label="Kích thước"
              value={`${wo.dimensions.length_mm} × ${wo.dimensions.width_mm} mm`}
            />
          )}
          <Field
            label="Phân công"
            value={wo.assigned_to_name ?? '—'}
          />
          <Field label="Ngày tạo" value={formatDate(wo.created_at)} />
        </div>
      </div>

      {/* Consumptions */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Vật tư tiêu thụ</h2>
        <div className="rounded-lg border">
          {consumptionsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : consumptionsError ? (
            <p className="p-4 text-sm text-destructive">Không thể tải vật tư tiêu thụ.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại vật tư</TableHead>
                  <TableHead>Mã vật tư</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!consumptions || consumptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Chưa có vật tư nào được ghi nhận.
                    </TableCell>
                  </TableRow>
                ) : (
                  consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.material_type}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {c.material_id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-right">{c.quantity}</TableCell>
                      <TableCell>{c.unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work-orders">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <ClipboardCheck className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Chi tiết lệnh sản xuất</h1>
      </div>
      <WorkOrderDetail id={id} />
    </div>
  )
}
