import type { Metadata } from 'next'
import { StatCard } from '@/components/dashboard/stat-card'
import { AlertBanner } from '@/components/dashboard/alert-banner'
import { Layers, AreaChart, Clock, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Tổng quan' }

// Data is fetched server-side — swap to React Server Component data fetching
// or TanStack Query client component once the API is ready.
export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tổng quan</h1>

      {/* Overflow alert banner — shown when status is RED */}
      <AlertBanner
        status="GREEN"
        utilizationPct={8}
        message="Kho tấm lẻ trong giới hạn bình thường (8%)"
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tấm lẻ"
          value="124"
          description="tấm đang có sẵn"
          icon={Layers}
        />
        <StatCard
          title="Tổng diện tích"
          value="47.3 m²"
          description="tấm lẻ trong kho"
          icon={AreaChart}
        />
        <StatCard
          title="Tuổi trung bình"
          value="6.2 ngày"
          description="thời gian lưu kho TB"
          icon={Clock}
        />
        <StatCard
          title="Tỷ lệ tận dụng"
          value="8%"
          description="tấm lẻ / nguyên liệu thô"
          icon={AlertTriangle}
          trend="neutral"
        />
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Hiệu suất cắt theo tuần
          </p>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            [Chart — Recharts sẽ được tích hợp tại đây]
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Tấm lẻ theo loại vật liệu
          </p>
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            [Pie chart — Recharts sẽ được tích hợp tại đây]
          </div>
        </div>
      </div>
    </div>
  )
}
