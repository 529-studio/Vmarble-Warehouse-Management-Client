'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRemnantAging, useMarkWaste } from '@/lib/hooks/use-remnants'
import type { RemnantAgingLevel, RemnantAgingRow } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<RemnantAgingLevel, string> = {
  OK: 'Bình thường',
  AT_RISK: 'Có nguy cơ',
  EXPIRED: 'Hết hạn',
}

const LEVEL_BADGE: Record<RemnantAgingLevel, 'default' | 'secondary' | 'destructive'> = {
  OK: 'default',
  AT_RISK: 'secondary',
  EXPIRED: 'destructive',
}

function rowBg(level?: RemnantAgingLevel) {
  if (level === 'EXPIRED') return 'bg-red-50'
  if (level === 'AT_RISK') return 'bg-orange-50'
  return ''
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number | undefined
  colorClass: string
}) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>
          {value ?? '—'}
        </span>
      </CardContent>
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemnantAgingPage() {
  const [levelFilter, setLevelFilter] = useState<RemnantAgingLevel | 'ALL'>('ALL')
  const [supplierQuery, setSupplierQuery] = useState('')
  const [minAge, setMinAge] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading, isError } = useRemnantAging()
  const markWaste = useMarkWaste()

  const rows = useMemo<RemnantAgingRow[]>(() => {
    const all = data?.rows ?? []
    return all.filter((r) => {
      if (levelFilter !== 'ALL' && r.level !== levelFilter) return false
      if (supplierQuery && r.remnant?.supplier_code) {
        if (!r.remnant.supplier_code.toLowerCase().includes(supplierQuery.toLowerCase())) return false
      }
      if (minAge) {
        const min = Number(minAge)
        if (Number.isFinite(min) && (r.age_days ?? 0) < min) return false
      }
      return true
    })
  }, [data?.rows, levelFilter, supplierQuery, minAge])

  const allIds = rows.map((r) => r.remnant?.id).filter(Boolean) as string[]
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkWaste() {
    const ids = Array.from(selected)
    let failed = 0
    for (const id of ids) {
      try {
        await markWaste.mutateAsync(id)
      } catch {
        failed++
      }
    }
    setSelected(new Set())
    if (failed > 0) {
      toast.error(`${failed} tấm lẻ không thể đánh dấu phế liệu.`)
    } else {
      toast.success(`Đã đánh dấu ${ids.length} tấm lẻ là phế liệu.`)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/remnants" aria-label="Quay lại Kho tấm lẻ">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Tấm lẻ lão hóa</h1>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Bình thường" value={data?.total_ok} colorClass="text-green-600" />
          <StatCard label="Có nguy cơ (> {data?.warn_days ?? 60}d)" value={data?.total_at_risk} colorClass="text-orange-600" />
          <StatCard label="Hết hạn (> {data?.expire_days ?? 90}d)" value={data?.total_expired} colorClass="text-destructive" />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={levelFilter}
          onValueChange={(v) => setLevelFilter(v as RemnantAgingLevel | 'ALL')}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Lọc mức độ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả mức độ</SelectItem>
            <SelectItem value="OK">Bình thường</SelectItem>
            <SelectItem value="AT_RISK">Có nguy cơ</SelectItem>
            <SelectItem value="EXPIRED">Hết hạn</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={supplierQuery}
          onChange={(e) => setSupplierQuery(e.target.value)}
          placeholder="Tìm theo nhà cung cấp…"
          className="h-9 w-52"
        />

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Tuổi tối thiểu (ngày):</span>
          <Input
            type="number"
            min="0"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            className="h-9 w-20"
            placeholder="0"
          />
        </div>

        {someSelected && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkWaste}
            disabled={markWaste.isPending}
            className="ml-auto"
          >
            <Trash2 className="size-4" />
            Đánh dấu phế liệu ({selected.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isError ? (
          <p className="p-6 text-sm text-destructive">Không thể tải dữ liệu. Kiểm tra kết nối API.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Chọn tất cả"
                  />
                </TableHead>
                <TableHead>ID tấm lẻ</TableHead>
                <TableHead>Kích thước (mm)</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead>Lô hàng</TableHead>
                <TableHead className="text-right">Tuổi (ngày)</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Không có tấm lẻ nào phù hợp với bộ lọc.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => {
                  const r = row.remnant
                  const id = r?.id ?? `row-${i}`
                  const isChecked = selected.has(id)
                  return (
                    <TableRow key={id} className={rowBg(row.level)}>
                      <TableCell>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(id)}
                          aria-label={`Chọn ${id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r?.id?.slice(0, 8) ?? '—'}…</TableCell>
                      <TableCell className="tabular-nums">
                        {r?.dimensions
                          ? `${r.dimensions.length_mm} × ${r.dimensions.width_mm}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{r?.supplier_code ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r?.lot_batch ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {row.age_days ?? '—'}
                      </TableCell>
                      <TableCell>
                        {row.level ? (
                          <Badge variant={LEVEL_BADGE[row.level]}>
                            {LEVEL_LABEL[row.level]}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r?.status ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
