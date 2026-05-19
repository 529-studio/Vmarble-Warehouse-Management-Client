'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Layers, TrendingUp, Scissors, DollarSign, AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { AlertBanner } from '@/components/dashboard/alert-banner'
import { CncQueueDepthWidget } from '@/components/dashboard/cnc-queue-depth-widget'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardOverview, useWIPPipeline } from '@/lib/hooks/use-dashboard'
import { useOverflowStatus } from '@/lib/hooks/use-inventory'
import { useSKUs } from '@/lib/hooks/use-skus'
import { getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { formatVND } from '@/lib/format'
import type { RecentCutItem, RecentWorkOrderItem, RecentCostingFinalizationItem, WholeSheetsByMaterialItem, WorkOrderStatus, WIPPipelineEntry, MaterialType } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function formatAge(iso: string | null): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'Hôm nay'
  return `${days} ngày`
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2']

const WIP_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Kế hoạch',
  IN_CUTTING: 'Đang cắt',
  IN_PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  COSTED: 'Đã tính giá',
}

const WIP_STATUS_COLOR: Record<WorkOrderStatus, string> = {
  PLANNED: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_CUTTING: 'bg-orange-100 text-orange-700 border-orange-200',
  IN_PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  COSTED: 'bg-purple-100 text-purple-700 border-purple-200',
}

const WIP_STATUS_ORDER: WorkOrderStatus[] = ['PLANNED', 'IN_CUTTING', 'IN_PROCESSING', 'COMPLETED', 'COSTED']

const WIP_VISIBLE_ROLES = new Set(['admin', 'planner', 'cnc_manager'])

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PLYWOOD: 'Gỗ ép',
  GLUE: 'Keo',
  METAL: 'Kim loại',
  ACCESSORY: 'Phụ kiện',
  OTHER: 'Khác',
}

function materialTypeLabel(type: MaterialType | string): string {
  return MATERIAL_TYPE_LABEL[type] ?? type
}

// ── WIP Pipeline widget ───────────────────────────────────────────────────────

function WIPPipelineWidget() {
  const { data, isLoading, isError } = useWIPPipeline()
  const role = useMemo(() => {
    if (typeof window === 'undefined') return null
    return getCurrentRoleFromCookie()
  }, [])

  if (!role || !WIP_VISIBLE_ROLES.has(role)) return null

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">Không thể tải WIP pipeline.</p>
      </div>
    )
  }

  const stageMap = new Map<WorkOrderStatus, WIPPipelineEntry>(
    data.stages.map((s) => [s.status, s])
  )

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Scissors className="size-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Pipeline lệnh cắt</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {WIP_STATUS_ORDER.map((status) => {
          const entry = stageMap.get(status)
          const count = entry?.count ?? 0
          const atRisk = entry?.at_risk_count ?? 0
          const age = entry?.oldest_started_at ?? null
          const hasRisk = atRisk > 0

          return (
            <Link
              key={status}
              href={`/work-orders?status=${status}`}
              className="group flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${WIP_STATUS_COLOR[status]}`}>
                {WIP_STATUS_LABEL[status]}
              </span>
              <span className="text-2xl font-bold tabular-nums">{count}</span>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>Tuổi: {formatAge(age)}</p>
                {hasRisk && (
                  <p className="flex items-center gap-1 font-medium text-destructive">
                    <AlertCircle className="size-3 shrink-0" />
                    {atRisk} rủi ro
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

// ── Recent activity sub-components ───────────────────────────────────────────

function RecentCuts({ items }: { items: RecentCutItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lệnh cắt nào.</p>
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Scissors className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{item.sku_code}</span>
            <span className="font-mono text-xs text-muted-foreground">{shortId(item.work_order_id)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
        </li>
      ))}
    </ul>
  )
}

function RecentWorkOrders({ items }: { items: RecentWorkOrderItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lệnh cắt hoàn thành.</p>
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            <span className="font-medium">{item.sku_code}</span>
            <span className="font-mono text-xs text-muted-foreground">{shortId(item.id)}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
        </li>
      ))}
    </ul>
  )
}

function RecentCosting({ items }: { items: RecentCostingFinalizationItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lần tính giá thành nào.</p>
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.work_order_id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{item.sku_code}</span>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatVND(item.total_cost)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Whole sheets by material ──────────────────────────────────────────────────

function WholeSheetsByMaterial({ items }: { items: WholeSheetsByMaterialItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Không có tấm nguyên nào trong kho.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="pb-2 font-medium">Tên vật liệu</th>
          <th className="pb-2 font-medium">Loại</th>
          <th className="pb-2 text-right font-medium">Số tấm còn lại</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.material_id} className="border-b last:border-0">
            <td className="py-2 font-medium">{item.material_name}</td>
            <td className="py-2 text-muted-foreground">{materialTypeLabel(item.material_type)}</td>
            <td className="py-2 text-right font-semibold tabular-nums">{item.available_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const { data, isLoading, isError, refetch } = useDashboardOverview()
  const { data: overflow } = useOverflowStatus()
  // Pulled alongside the overview so the pie chart can render the SKU name
  // next to the SKU code (the backend dashboard payload only includes the code).
  const { data: skusData } = useSKUs({ limit: 200 })
  const skuNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const sku of skusData?.items ?? []) map.set(sku.code, sku.name)
    return map
  }, [skusData?.items])

  if (isLoading) return <OverviewSkeleton />

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-destructive">Không thể tải dữ liệu tổng quan. Vui lòng thử lại.</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          Thử lại
        </button>
      </div>
    )
  }

  const { kpi, charts, recent_activity } = data
  const utilizationPct = Math.round(kpi.utilization_pct)
  // Take the worst of (a) dashboard utilization buckets and (b) the live
  // overflow-status — they query different things and used to disagree
  // on screen (e.g. red sticky banner over a green "bình thường" pill).
  const utilizationStatus: 'RED' | 'YELLOW' | 'GREEN' =
    utilizationPct >= 90 ? 'RED' : utilizationPct >= 70 ? 'YELLOW' : 'GREEN'
  const overflowStatus = overflow?.status ?? 'GREEN'
  const alertStatus: 'RED' | 'YELLOW' | 'GREEN' =
    overflowStatus === 'RED' || utilizationStatus === 'RED'
      ? 'RED'
      : overflowStatus === 'YELLOW' || utilizationStatus === 'YELLOW'
        ? 'YELLOW'
        : 'GREEN'

  const trendData = (charts.remnant_trend_7d ?? []).map((p) => ({
    ...p,
    date: formatDate(p.date),
  }))

  const pieData = (charts.cost_allocation ?? []).map((p) => {
    const name = skuNameByCode.get(p.sku_code)
    return {
      name: name ? `${p.sku_code} — ${name}` : p.sku_code,
      value: p.cost,
    }
  })

  const barData = (charts.material_usage ?? []).map((p) => ({
    ...p,
    date: formatDate(p.date),
  }))

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      <AlertBanner
        status={alertStatus}
        utilizationPct={utilizationPct}
        overflowPct={overflow?.overflow_pct}
        thresholdPct={overflow?.threshold_pct}
        drivenByOverflow={overflowStatus === 'RED'}
        message={
          alertStatus === 'RED'
            ? 'Kho tấm lẻ quá tải — tạm ngừng xuất tấm nguyên'
            : alertStatus === 'YELLOW'
              ? 'Kho tấm lẻ sắp đầy — cân nhắc xuất bớt'
              : 'Kho tấm lẻ trong giới hạn bình thường'
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tấm lẻ"
          value={kpi.remnants.total.toString()}
          description={`${kpi.remnants.available} khả dụng · ${kpi.remnants.allocated} phân bổ`}
          icon={Layers}
        />
        <StatCard
          title="Tỷ lệ sử dụng kho"
          value={`${utilizationPct}%`}
          description="diện tích tấm lẻ / tấm nguyên"
          icon={TrendingUp}
          trend={utilizationPct >= 90 ? 'down' : utilizationPct >= 70 ? 'neutral' : 'up'}
        />
        <StatCard
          title="Lệnh cắt đang chạy"
          value={kpi.active_work_orders.toString()}
          description="trạng thái Đang cắt / Đang xử lý"
          icon={Scissors}
        />
        <StatCard
          title="Chờ tính giá thành"
          value={kpi.pending_costing.toString()}
          description={kpi.pending_costing > 0 ? 'Cần chốt giá thành' : 'Đã cập nhật đầy đủ'}
          icon={DollarSign}
          trend={kpi.pending_costing > 0 ? 'down' : 'up'}
        />
      </div>

      {/* WIP Pipeline */}
      <WIPPipelineWidget />

      {/* CNC queue depth — visible to admin + cnc_manager */}
      <CncQueueDepthWidget />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Remnant trend line chart */}
        <div className="col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold">Xu hướng tấm lẻ 7 ngày</p>
          {trendData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="available" stroke="#2563eb" name="Khả dụng" dot={false} />
                <Line type="monotone" dataKey="allocated" stroke="#16a34a" name="Phân bổ" dot={false} />
                <Line type="monotone" dataKey="waste" stroke="#dc2626" name="Hao hụt" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost allocation pie chart */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold">Chi phí theo sản phẩm (top 10)</p>
          {pieData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatVND(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Material usage stacked bar */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold">Sử dụng nguyên liệu 7 ngày</p>
        {barData.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Chưa có dữ liệu</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="PLYWOOD" stackId="a" fill="#2563eb" name="Gỗ ép" />
              <Bar dataKey="METAL" stackId="a" fill="#dc2626" name="Kim loại" />
              <Bar dataKey="ACCESSORY" stackId="a" fill="#d97706" name="Phụ kiện" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Whole sheets by material */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Tấm nguyên theo vật liệu</p>
        </div>
        {kpi.whole_sheets_by_material !== undefined ? (
          <WholeSheetsByMaterial items={kpi.whole_sheets_by_material} />
        ) : (
          <p className="text-sm text-muted-foreground">Dữ liệu chưa khả dụng.</p>
        )}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Lần cắt gần nhất</p>
          </div>
          <RecentCuts items={recent_activity.recent_cuts ?? []} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Lệnh cắt hoàn thành</p>
          </div>
          <RecentWorkOrders items={recent_activity.completed_work_orders ?? []} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Tính giá thành gần đây</p>
          </div>
          <RecentCosting items={recent_activity.costing_finalizations ?? []} />
        </div>
      </div>
    </div>
  )
}
