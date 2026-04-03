'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { remnantsApi } from '@/lib/api/remnants'

const ageDays = (createdAt: string) =>
  Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)

export default function RemnantListPage() {
  const [search, setSearch] = useState('')

  const { data: remnants, isLoading, isError } = useQuery({
    queryKey: ['remnants'],
    queryFn: () => remnantsApi.list({ status: 'AVAILABLE' }),
    staleTime: 30_000,
  })

  const items = remnants?.items ?? []
  const filtered = items.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.id.toLowerCase().includes(q) ||
      `${r.dimensions.length_mm}`.includes(q) ||
      `${r.dimensions.width_mm}`.includes(q)
    )
  })

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Kho tấm lẻ</h1>

      <Input
        placeholder="Tìm theo kích thước, ID..."
        className="h-11 text-base"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))
      ) : isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Không thể tải dữ liệu. Kiểm tra kết nối API.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Không có tấm lẻ nào khả dụng.
        </p>
      ) : (
        filtered.map((r) => (
          <Card key={r.id} className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="font-semibold font-mono text-sm">{r.id.slice(0, 8)}…</p>
                <p className="text-sm text-muted-foreground">
                  {r.dimensions.length_mm} × {r.dimensions.width_mm} mm
                </p>
                <p className="text-sm text-muted-foreground">
                  Nguồn: {r.parent_board_id
                    ? `Board ${r.parent_board_id.slice(0, 6)}…`
                    : r.parent_remnant_id
                      ? `Remnant ${r.parent_remnant_id.slice(0, 6)}…`
                      : '—'}
                </p>
              </div>
              <Badge variant="outline">{ageDays(r.created_at)} ngày</Badge>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
