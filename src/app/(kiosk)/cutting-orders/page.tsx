'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cuttingOrdersApi } from '@/lib/api/cutting-orders'
import type { WorkOrderStatus } from '@/types/api'

const statusVariant = (status: WorkOrderStatus) => {
  if (status === 'IN_CUTTING') return 'default' as const
  if (status === 'COMPLETED' || status === 'COSTED') return 'secondary' as const
  return 'outline' as const
}

const statusLabel: Record<WorkOrderStatus, string> = {
  PLANNED: 'Đã lên kế hoạch',
  IN_CUTTING: 'Đang cắt',
  IN_PROCESSING: 'Đang gia công',
  COMPLETED: 'Hoàn thành',
  COSTED: 'Đã tính giá',
}

export default function CuttingOrdersPage() {
  const { data: workOrders, isLoading, isError } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => cuttingOrdersApi.list(),
    staleTime: 30_000,
  })

  return (
    <div className="space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold">Lệnh cắt</h1>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))
      ) : isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không thể tải lệnh cắt. Kiểm tra kết nối API.
        </p>
      ) : !workOrders || workOrders.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Không có lệnh cắt nào.
        </p>
      ) : (
        workOrders.map((wo) => (
          <Card key={wo.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="text-base font-semibold font-mono">{wo.id.slice(0, 8)}…</p>
                <p className="text-sm text-muted-foreground">
                  SKU: {wo.sku_id.slice(0, 8)}… · SL: {wo.quantity}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(wo.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <Badge variant={statusVariant(wo.status)}>
                {statusLabel[wo.status] ?? wo.status}
              </Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
