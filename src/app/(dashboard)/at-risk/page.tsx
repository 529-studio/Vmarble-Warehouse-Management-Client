'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAtRisk } from '@/lib/hooks/use-containers'
import type { AtRiskRow } from '@/types/api'

function RiskBadge({ row }: { row: AtRiskRow }) {
  if (row.risk_level === 'RED')
    return <Badge variant="destructive">Đỏ</Badge>
  return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Cam</Badge>
}

function cutoffText(days: number | undefined): string {
  if (days === undefined || days === null) return '—'
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Hôm nay'
  return `Còn ${days} ngày`
}

function cutoffCls(days: number | undefined): string {
  if (days === undefined) return ''
  if (days < 3) return 'text-destructive font-semibold'
  return 'text-orange-600 font-medium'
}

function gapCbm(row: AtRiskRow): string {
  if (row.max_cbm === undefined || row.used_cbm === undefined) return '—'
  const gap = Math.max(0, row.max_cbm - row.used_cbm)
  return `${gap.toFixed(2)} m³`
}

function fillPct(row: AtRiskRow): string {
  return row.fill_pct_cbm !== undefined ? `${row.fill_pct_cbm.toFixed(1)}%` : '—'
}

export default function AtRiskPage() {
  const [days, setDays] = useState(7)
  const { data, isLoading, error } = useAtRisk(days)
  const rows = data ?? []

  if (isLoading) return <AtRiskSkeleton />

  if (error)
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertTriangle className="size-8 text-destructive" />
        <p>Không thể tải dữ liệu. Vui lòng thử lại.</p>
      </div>
    )

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nguy cơ thiếu hàng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Container đang loading, cutoff sắp đến nhưng chưa đủ hàng
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 ngày tới</SelectItem>
            <SelectItem value="7">7 ngày tới</SelectItem>
            <SelectItem value="14">14 ngày tới</SelectItem>
            <SelectItem value="30">30 ngày tới</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground rounded-lg border">
          <AlertTriangle className="size-8 text-emerald-500" />
          <p className="font-medium text-emerald-700">Không có container trong nguy cơ</p>
          <p className="text-sm">Tất cả container đang được xếp hàng đúng tiến độ.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container</TableHead>
                <TableHead>Tàu</TableHead>
                <TableHead>Cutoff</TableHead>
                <TableHead>Đã xếp</TableHead>
                <TableHead>Còn thiếu (CBM)</TableHead>
                <TableHead>Mức nguy cơ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium">
                    <Link
                      href={`/containers/${row.id}`}
                      className="hover:underline text-primary"
                    >
                      {row.code ?? row.id?.slice(0, 8).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell>{row.vessel_name ?? '—'}</TableCell>
                  <TableCell className={cutoffCls(row.days_to_cutoff)}>
                    {cutoffText(row.days_to_cutoff)}
                    {row.cutoff_date && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        {new Date(row.cutoff_date).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{fillPct(row)}</TableCell>
                  <TableCell>{gapCbm(row)}</TableCell>
                  <TableCell>
                    <RiskBadge row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Tự động cập nhật mỗi 60 giây.</p>
    </div>
  )
}

function AtRiskSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
