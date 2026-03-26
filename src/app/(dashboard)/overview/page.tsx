'use client'

import { useQuery } from '@tanstack/react-query'
import { Layers, TrendingDown, Clock, BarChart2 } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { AlertBanner } from '@/components/dashboard/alert-banner'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardApi } from '@/lib/api/dashboard'
import type { Remnant, WorkOrder, CostingRecord } from '@/types/api'

function computeStats(remnants: Remnant[], _workOrders: WorkOrder[], _costing: CostingRecord[]) {
  const available = remnants.filter((r) => r.status === 'AVAILABLE')
  const totalCount = available.length

  const totalAreaMm2 = available.reduce(
    (sum, r) => sum + r.dimensions.length_mm * r.dimensions.width_mm,
    0,
  )
  const totalAreaM2 = totalAreaMm2 / 1_000_000

  const now = Date.now()
  const avgAgeDays =
    available.length > 0
      ? available.reduce((sum, r) => {
          const days = (now - new Date(r.created_at).getTime()) / 86_400_000
          return sum + days
        }, 0) / available.length
      : 0

  const allocated = remnants.filter((r) => r.status === 'ALLOCATED').length
  const utilizationPct =
    totalCount + allocated > 0
      ? Math.round((allocated / (totalCount + allocated)) * 100)
      : 0

  const overflowStatus: 'RED' | 'YELLOW' | 'GREEN' =
    utilizationPct >= 90 ? 'RED' : utilizationPct >= 70 ? 'YELLOW' : 'GREEN'

  return { totalCount, totalAreaM2, avgAgeDays, utilizationPct, overflowStatus }
}

export default function OverviewPage() {
  const remnantsQ = useQuery({
    queryKey: ['dashboard-remnants'],
    queryFn: dashboardApi.getRemnants,
    staleTime: 30_000,
  })
  const workOrdersQ = useQuery({
    queryKey: ['dashboard-work-orders'],
    queryFn: dashboardApi.getWorkOrders,
    staleTime: 30_000,
  })
  const costingQ = useQuery({
    queryKey: ['dashboard-costing'],
    queryFn: dashboardApi.getCostingRecords,
    staleTime: 30_000,
  })

  const isLoading = remnantsQ.isLoading || workOrdersQ.isLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const remnants = remnantsQ.data ?? []
  const workOrders = workOrdersQ.data ?? []
  const costing = costingQ.data ?? []
  const stats = computeStats(remnants, workOrders, costing)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      <AlertBanner
        status={stats.overflowStatus}
        utilizationPct={stats.utilizationPct}
        message={
          stats.overflowStatus === 'RED'
            ? 'Kho tấm lẻ quá tải — tạm ngừng xuất tấm nguyên'
            : stats.overflowStatus === 'YELLOW'
              ? 'Kho tấm lẻ sắp đầy — cân nhắc xuất bớt'
              : 'Kho tấm lẻ trong giới hạn bình thường'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tấm lẻ"
          value={stats.totalCount.toString()}
          description="tấm đang có sẵn"
          icon={Layers}
        />
        <StatCard
          title="Tổng diện tích"
          value={`${stats.totalAreaM2.toFixed(1)} m²`}
          description="tấm lẻ khả dụng"
          icon={BarChart2}
        />
        <StatCard
          title="Tuổi trung bình"
          value={`${stats.avgAgeDays.toFixed(1)} ngày`}
          description="thời gian lưu kho TB"
          icon={Clock}
        />
        <StatCard
          title="Tỷ lệ phân bổ"
          value={`${stats.utilizationPct}%`}
          description="đang được phân bổ"
          icon={TrendingDown}
          trend={stats.utilizationPct >= 90 ? 'down' : stats.utilizationPct >= 70 ? 'neutral' : 'up'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Hiệu suất cắt theo tuần
          </p>
          <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
            [Chart — Recharts sẽ được tích hợp tại đây]
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Tấm lẻ theo trạng thái
          </p>
          <div className="flex h-48 items-center justify-center">
            {remnants.length > 0 ? (
              <ul className="space-y-2 text-left">
                {(['AVAILABLE', 'ALLOCATED', 'CONSUMED', 'WASTE'] as const).map((s) => {
                  const count = remnants.filter((r) => r.status === s).length
                  return count > 0 ? (
                    <li key={s} className="flex gap-3 text-sm">
                      <span className="font-mono text-muted-foreground w-24">{s}</span>
                      <span className="font-bold">{count}</span>
                    </li>
                  ) : null
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
