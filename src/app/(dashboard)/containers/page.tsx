'use client'

import { Suspense, useMemo, useState } from 'react'
import { Container as ContainerIcon, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useContainers } from '@/lib/hooks/use-containers'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { CONTAINER_STATUSES } from '@/types/api'
import type { Container, ContainerStatus } from '@/types/api'

const STATUS_LABEL: Record<ContainerStatus, string> = {
  OPEN: 'Mở',
  LOADING: 'Đang xếp',
  SEALED: 'Đã niêm phong',
  SHIPPED: 'Đã xuất',
  CANCELLED: 'Đã huỷ',
}

const STATUS_COLUMN_CLASS: Record<ContainerStatus, string> = {
  OPEN: 'border-slate-200 bg-slate-50',
  LOADING: 'border-blue-200 bg-blue-50',
  SEALED: 'border-violet-200 bg-violet-50',
  SHIPPED: 'border-emerald-200 bg-emerald-50',
  CANCELLED: 'border-rose-200 bg-rose-50',
}

function formatPct(pct: number) {
  if (!Number.isFinite(pct)) return '0%'
  return `${pct.toFixed(0)}%`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  })
}

function ContainerCard({ container }: { container: Container }) {
  const cbmPct = container.fill_pct_cbm ?? 0
  const massPct = container.fill_pct_mass ?? 0
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-sm font-semibold">{container.code}</span>
          <Badge variant="outline" className="shrink-0 text-xs">
            {container.container_type}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">CBM</span>
            <span className="font-medium tabular-nums">{formatPct(cbmPct)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, cbmPct))}%` }}
              aria-label={`CBM filled ${formatPct(cbmPct)}`}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Khối lượng</span>
            <span className="font-medium tabular-nums">{formatPct(massPct)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, massPct))}%` }}
              aria-label={`Mass filled ${formatPct(massPct)}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Tạo {formatDate(container.created_at)}</span>
          {container.sealed_at && <span>Niêm phong {formatDate(container.sealed_at)}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function ColumnSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  )
}

function ContainersKanban() {
  const { search, setSearch, getParam, setParam } = usePageParams()

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)
  const [prevDebounced, setPrevDebounced] = useState(debouncedSearch)
  if (prevDebounced !== debouncedSearch) {
    setPrevDebounced(debouncedSearch)
    setSearch(debouncedSearch)
  }

  const containerType = getParam('container_type') ?? 'ALL'

  // Phase 1 keeps a single round-trip with a generous limit and buckets
  // client-side. When data crosses ~100 active containers we will switch to
  // one query per column with its own cursor.
  const { data, isLoading, isError } = useContainers({
    limit: 100,
    search: debouncedSearch || undefined,
    container_type: containerType === 'ALL' ? undefined : containerType,
  })

  const containers = useMemo(() => data?.items ?? [], [data?.items])

  const buckets = useMemo(() => {
    const out: Record<ContainerStatus, Container[]> = {
      OPEN: [],
      LOADING: [],
      SEALED: [],
      SHIPPED: [],
      CANCELLED: [],
    }
    for (const c of containers) {
      if (out[c.status]) out[c.status].push(c)
    }
    return out
  }, [containers])

  const containerTypes = useMemo(() => {
    const set = new Set<string>()
    for (const c of containers) if (c.container_type) set.add(c.container_type)
    return Array.from(set).sort()
  }, [containers])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tìm theo mã container…"
            className="pl-8"
          />
        </div>

        <Select
          value={containerType}
          onValueChange={(v) => setParam('container_type', v === 'ALL' ? undefined : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Loại container" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả loại</SelectItem>
            {containerTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {isLoading ? 'Đang tải…' : `${containers.length} container`}
        </span>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách container.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {CONTAINER_STATUSES.map((status) => {
            const items = buckets[status]
            return (
              <section
                key={status}
                className={`flex flex-col rounded-lg border p-3 ${STATUS_COLUMN_CLASS[status]}`}
                aria-label={STATUS_LABEL[status]}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
                  <Badge variant="secondary" className="bg-white">
                    {isLoading ? '…' : items.length}
                  </Badge>
                </header>

                <div className="space-y-2">
                  {isLoading ? (
                    <ColumnSkeleton />
                  ) : items.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-white/40 p-3 text-center text-xs text-muted-foreground">
                      Chưa có container ở trạng thái này.
                    </p>
                  ) : (
                    items.map((c) => <ContainerCard key={c.id} container={c} />)
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function ContainersPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ContainerIcon className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Container</h1>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-lg" />
            <div className="grid gap-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          </div>
        }
      >
        <ContainersKanban />
      </Suspense>
    </div>
  )
}
