'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { remnantsApi } from '@/lib/api/remnants'

const statusVariant = (status: string) => {
  if (status === 'AVAILABLE') return 'default' as const
  if (status === 'ALLOCATED') return 'secondary' as const
  return 'outline' as const
}

export default function RemnantsPage() {
  const [search, setSearch] = useState('')

  const { data: remnants, isLoading, isError } = useQuery({
    queryKey: ['remnants'],
    queryFn: () => remnantsApi.list(),
    staleTime: 30_000,
  })

  const filtered = (remnants ?? []).filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.id.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      `${r.dimensions.length_mm}`.includes(q) ||
      `${r.dimensions.width_mm}`.includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kho tấm lẻ</h1>

      <div className="flex gap-3">
        <Input
          className="max-w-sm"
          placeholder="Tìm theo ID, kích thước, trạng thái..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Không thể tải dữ liệu. Kiểm tra kết nối API.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kích thước (mm)</TableHead>
                <TableHead>Nguồn gốc</TableHead>
                <TableHead>Được phân bổ cho</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Không có tấm lẻ nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      {r.dimensions.length_mm} × {r.dimensions.width_mm}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.parent_board_id
                        ? `Board: ${r.parent_board_id.slice(0, 6)}…`
                        : r.parent_remnant_id
                          ? `Remnant: ${r.parent_remnant_id.slice(0, 6)}…`
                          : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.allocated_to_wo ? `${r.allocated_to_wo.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
