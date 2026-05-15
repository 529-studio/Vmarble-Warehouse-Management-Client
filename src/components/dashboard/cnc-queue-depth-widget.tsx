'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useUsers } from '@/lib/hooks/use-users'
import { useWorkOrders } from '@/lib/hooks/use-work-orders'
import { getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { WorkOrder } from '@/types/api'

const CNC_QUEUE_VISIBLE_ROLES = new Set(['admin', 'cnc_manager'])

interface QueueRow {
  userId: string
  label: string
  plannedCount: number
  inCuttingCount: number
  /** Σ estimated_hours of WOs currently in cutting — proxy for "giờ đã giao". */
  estimatedHoursInCutting: number
}

function aggregateQueue(
  users: Array<{ id: string; username: string; full_name?: string | null }>,
  planned: WorkOrder[],
  inCutting: WorkOrder[],
): QueueRow[] {
  const rows = new Map<string, QueueRow>()
  // Seed every CNC operator so even idle workers appear with zero counts.
  for (const u of users) {
    rows.set(u.id, {
      userId: u.id,
      label: u.full_name?.trim() || u.username,
      plannedCount: 0,
      inCuttingCount: 0,
      estimatedHoursInCutting: 0,
    })
  }
  for (const wo of planned) {
    if (!wo.assigned_to) continue
    const row = rows.get(wo.assigned_to)
    if (!row) continue
    row.plannedCount += 1
  }
  for (const wo of inCutting) {
    if (!wo.assigned_to) continue
    const row = rows.get(wo.assigned_to)
    if (!row) continue
    row.inCuttingCount += 1
    if (typeof wo.estimated_hours === 'number') {
      row.estimatedHoursInCutting += wo.estimated_hours
    }
  }
  return Array.from(rows.values()).sort((a, b) => {
    // Most loaded first, then alphabetical so the table is stable across renders.
    const loadDiff = (b.plannedCount + b.inCuttingCount) - (a.plannedCount + a.inCuttingCount)
    if (loadDiff !== 0) return loadDiff
    return a.label.localeCompare(b.label, 'vi')
  })
}

export function CncQueueDepthWidget() {
  const role = useMemo(() => {
    if (typeof window === 'undefined') return null
    return getCurrentRoleFromCookie()
  }, [])

  const enabled = !!role && CNC_QUEUE_VISIBLE_ROLES.has(role)

  const { data: usersData, isLoading: loadingUsers, isError: usersError } = useUsers(
    enabled ? { role: 'cnc', limit: 200, is_active: true } : undefined,
  )
  const { data: plannedData, isLoading: loadingPlanned, isError: plannedError } = useWorkOrders(
    enabled ? { status: 'PLANNED', limit: 500 } : {},
  )
  const { data: inCuttingData, isLoading: loadingInCutting, isError: inCuttingError } =
    useWorkOrders(enabled ? { status: 'IN_CUTTING', limit: 500 } : {})

  const rows = useMemo(() => {
    return aggregateQueue(
      usersData?.items ?? [],
      plannedData?.items ?? [],
      inCuttingData?.items ?? [],
    )
  }, [usersData?.items, plannedData?.items, inCuttingData?.items])

  if (!enabled) return null

  const isLoading = loadingUsers || loadingPlanned || loadingInCutting
  const isError = usersError || plannedError || inCuttingError

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="mb-4 h-5 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Không thể tải tải hàng đợi CNC.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Hàng đợi theo công nhân CNC</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có công nhân CNC nào hoạt động.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Công nhân CNC</th>
                <th className="px-3 py-2 text-right font-medium">Đang chờ</th>
                <th className="px-3 py-2 text-right font-medium">Đang cắt</th>
                <th className="px-3 py-2 text-right font-medium">Giờ đã giao</th>
                <th className="px-3 py-2 text-right font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.plannedCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.inCuttingCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {row.estimatedHoursInCutting > 0
                      ? `${row.estimatedHoursInCutting.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}h`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/cutting-dispatch?status=PLANNED&assigned=${row.userId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Xem hàng đợi →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        &quot;Giờ đã giao&quot; = tổng <span className="font-mono">estimated_hours</span> của các lệnh đang cắt;
        capacity từ <span className="font-mono">shift-slots</span> sẽ bổ sung khi backend mở endpoint.
      </p>
    </div>
  )
}
