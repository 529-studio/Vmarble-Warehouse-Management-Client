'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { costingApi } from '@/lib/api/remnants'

const fmt = (n: number) =>
  n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

export default function CostingPage() {
  const { data: records, isLoading, isError } = useQuery({
    queryKey: ['costing'],
    queryFn: costingApi.list,
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tính giá thành</h1>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Không thể tải dữ liệu giá thành.</p>
      ) : !records || records.length === 0 ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Chưa có bản ghi giá thành nào.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tất cả bản ghi ({records.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order ID</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">CP vật liệu</TableHead>
                  <TableHead className="text-right">CP phụ trợ</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead>Hoàn tất</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.work_order_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.sku_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-right">
                      {fmt(r.material_cost.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fmt(r.auxiliary_cost.amount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(r.total_cost.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.finalized ? 'default' : 'outline'}>
                        {r.finalized ? 'Đã chốt' : 'Nháp'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
