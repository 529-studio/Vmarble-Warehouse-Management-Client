'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { useSalesOrders } from '@/lib/hooks/use-sales-orders'
import { useCustomers } from '@/lib/hooks/use-customers'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { SalesOrderStatus } from '@/types/api'

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

function SalesOrdersTable() {
  const router = useRouter()
  const { getParam, setParam } = usePageParams()
  const statusParam = (getParam('status') ?? 'all') as SalesOrderStatus | 'all'
  const customerParam = getParam('customer_id') ?? 'all'

  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError } = useSalesOrders({
    ...(statusParam !== 'all' ? { status: statusParam } : {}),
    ...(customerParam !== 'all' ? { customer_id: customerParam } : {}),
    limit: 200,
  })

  const { data: customersData } = useCustomers({ limit: 200 })
  const customers = customersData?.items ?? []

  const items = useMemo(() => {
    const all = data?.items ?? []
    if (!searchInput.trim()) return all
    const q = searchInput.trim().toLowerCase()
    return all.filter((so) => so.code.toLowerCase().includes(q))
  }, [data?.items, searchInput])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã đơn hàng…"
            className="pl-8"
          />
        </div>

        <Select
          value={statusParam}
          onValueChange={(v) => setParam('status', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {(Object.keys(STATUS_LABEL) as SalesOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={customerParam}
          onValueChange={(v) => setParam('customer_id', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Khách hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khách hàng</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {isLoading ? 'Đang tải…' : `${items.length} đơn hàng`}
        </span>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách đơn hàng.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Không có đơn hàng nào phù hợp.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày xuất dự kiến</TableHead>
                <TableHead>Cảng đến</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((so) => (
                <TableRow
                  key={so.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/sales-orders/${so.id}`)}
                >
                  <TableCell className="font-mono font-semibold">{so.code}</TableCell>
                  <TableCell>
                    {so.customer_name ?? so.customer_code ?? so.customer_id}
                    {so.customer_country_code && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {so.customer_country_code}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[so.status] ?? 'secondary'}>
                      {STATUS_LABEL[so.status] ?? so.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(so.expected_ship_date)}</TableCell>
                  <TableCell>{so.port_of_discharge ?? '—'}</TableCell>
                  <TableCell>{formatDate(so.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function SalesOrdersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <FileText className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Đơn hàng khách</h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        }
      >
        <SalesOrdersTable />
      </Suspense>
    </div>
  )
}
