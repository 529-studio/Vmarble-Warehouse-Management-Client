'use client'

import { use, useMemo, useSyncExternalStore, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { usePlan, useApprovePlan, useCancelPlan } from '@/lib/hooks/use-plans'
import { useSKUs } from '@/lib/hooks/use-skus'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { PlanStatus } from '@/types/api'

// ── Helpers

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  DRAFT: 'Nháp',
  APPROVED: 'Đã duyệt',
  CANCELED: 'Đã hủy',
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const colors: Record<PlanStatus, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    CANCELED: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <Badge variant="outline" className={colors[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const role = useCurrentRole()
  const canApprovePlan = can(role, 'approve', 'plans')
  const canCancelPlan = can(role, 'cancel', 'plans')

  const { data: plan, isLoading, isError } = usePlan(id)

  // Load SKUs to resolve code + name for plan items.
  // The GET /plans/:id endpoint returns only sku_id on each item.
  // useSKUs result is cached (staleTime 60s), so this is free when the SKU
  // list is already loaded from another page in the same session.
  const { data: skusData } = useSKUs({ limit: 500 })
  const skuById = Object.fromEntries((skusData?.items ?? []).map((s) => [s.id, s]))

  const [approveOpen, setApproveOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  const { mutate: approve, isPending: approving } = useApprovePlan()
  const { mutate: cancel, isPending: canceling } = useCancelPlan()

  function handleApprove() {
    approve(id, {
      onSuccess: () => {
        toast.success('Đã duyệt kế hoạch')
        setApproveOpen(false)
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Duyệt thất bại'))
      },
    })
  }

  function handleCancel() {
    cancel(id, {
      onSuccess: () => {
        toast.success('Đã hủy kế hoạch')
        setCancelOpen(false)
      },
      onError: (err) => {
        toast.error(mapApiErrorVi(err, 'Hủy thất bại'))
      },
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/plans">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Chi tiết kế hoạch</h1>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Không thể tải kế hoạch. Thử lại sau.</p>
      )}

      {/* Summary card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin kế hoạch</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : plan ? (
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-muted-foreground">Đơn hàng</p>
                <p className="font-medium">{plan.po_code ?? plan.po_id.slice(0, 8)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Trạng thái</p>
                <StatusBadge status={plan.status} />
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Hạn hoàn thành</p>
                <p className="font-medium">{plan.deadline ? formatDate(plan.deadline) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Ngày tạo</p>
                <p className="font-medium">{plan.created_at ? formatDate(plan.created_at) : '—'}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Action buttons — only for DRAFT */}
      {plan?.status === 'DRAFT' && (canApprovePlan || canCancelPlan) && (
        <div className="flex gap-3">
          {canApprovePlan && <Button onClick={() => setApproveOpen(true)}>Duyệt kế hoạch</Button>}
          {canCancelPlan && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              Hủy kế hoạch
            </Button>
          )}
        </div>
      )}

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Mã sản phẩm</TableHead>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !plan?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Không có sản phẩm nào.
                  </TableCell>
                </TableRow>
              ) : (
                plan.items.map((item, idx) => {
                  const sku = skuById[item.sku_id]
                  const code = item.sku_code ?? sku?.code ?? item.sku_id.slice(0, 8).toUpperCase()
                  const name = item.sku_name ?? sku?.name ?? '—'
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm font-medium">{code}</TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve confirm */}
      <ConfirmModal
        open={canApprovePlan && approveOpen}
        title="Duyệt kế hoạch sản xuất?"
        description="Kế hoạch sẽ chuyển sang trạng thái Đã duyệt. Hành động này không thể hoàn tác."
        confirmLabel="Duyệt"
        pendingLabel="Đang duyệt…"
        isPending={approving}
        onConfirm={handleApprove}
        onCancel={() => setApproveOpen(false)}
      />

      {/* Cancel confirm */}
      <ConfirmModal
        open={canCancelPlan && cancelOpen}
        title="Hủy kế hoạch sản xuất?"
        description="Kế hoạch sẽ bị hủy và không thể khôi phục."
        confirmLabel="Hủy kế hoạch"
        cancelLabel="Không"
        confirmVariant="destructive"
        pendingLabel="Đang hủy…"
        isPending={canceling}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  )
}
