'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFGPoolList } from '@/lib/hooks/use-packing'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { FGPoolStatus } from '@/types/api'

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
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function FGPoolTable() {
  const { getParam, setParam } = usePageParams()
  const statusParam = getParam('status') ?? 'all'

  const filter = useMemo(
    () => (statusParam !== 'all' ? { status: statusParam as FGPoolStatus, limit: 100 } : { limit: 100 }),
    [statusParam],
  )

  const { data, isLoading, isError } = useFGPoolList(filter)
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusParam} onValueChange={(v) => setParam('status', v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {isLoading ? 'Đang tải…' : `${items.length} thành phẩm`}
        </span>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách thành phẩm.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã vạch</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lệnh SX</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Không có thành phẩm nào.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((fg) => (
                  <TableRow key={fg.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/fg-pool/${fg.id}`} className="font-mono text-sm hover:underline">
                        {fg.barcode_id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">{fg.sku_code}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{fg.sku_name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[fg.status] ?? 'outline'}>
                        {STATUS_LABEL[fg.status] ?? fg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {fg.work_order_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(fg.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function FGPoolPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Boxes className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Thành phẩm chờ xuất</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
        <FGPoolTable />
      </Suspense>
    </div>
  )
}
