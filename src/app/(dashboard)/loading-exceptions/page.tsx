'use client'

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Container as ContainerIcon,
  Filter,
  Image as ImageIcon,
  Inbox,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { RoleGate } from '@/components/auth/role-gate'
import { ApproveExceptionDialog } from '@/components/containers/approve-exception-dialog'
import { BulkApproveDialog } from '@/components/containers/bulk-approve-dialog'
import {
  useGlobalLoadingExceptions,
  useLoadingExceptionsSummary,
} from '@/lib/hooks/use-loading-exceptions'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useContainers } from '@/lib/hooks/use-containers'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { cn } from '@/lib/utils'
import {
  LOADING_EXCEPTION_TYPES,
  type LoadingException,
  type LoadingExceptionType,
} from '@/types/api'
import type { ListGlobalExceptionsFilter } from '@/lib/api/loading-exceptions'

const TYPE_LABEL: Record<string, string> = {
  SHORT_SHIPPED: 'Thiếu hàng',
  OVER_LOADED: 'Dư hàng',
  WRONG_SKU: 'Sai SKU',
  SUBSTITUTION: 'Thay thế',
  DAMAGED_AT_LOADING: 'Hỏng khi xếp',
  UNPLANNED_UNIT: 'Ngoài plan',
  CUSTOMER_CHANGE: 'Khách đổi',
}

const TYPE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  SHORT_SHIPPED: 'outline',
  OVER_LOADED: 'destructive',
  WRONG_SKU: 'destructive',
  SUBSTITUTION: 'secondary',
  DAMAGED_AT_LOADING: 'destructive',
  UNPLANNED_UNIT: 'destructive',
  CUSTOMER_CHANGE: 'secondary',
}

const RESOLUTION_LABEL: Record<string, string> = {
  BACKORDER: 'Đặt hàng bù',
  CANCEL_FROM_SO: 'Huỷ từ đơn hàng',
  SUBSTITUTE_ACCEPTED: 'Thay thế chấp nhận',
  WRITE_OFF: 'Xoá sổ',
  DEFER_TO_NEXT: 'Hoãn chuyến sau',
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

function StatusBadge({ ex }: { ex: LoadingException }) {
  if (!ex.approved_by) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700">
        Chờ duyệt
      </Badge>
    )
  }
  if (ex.resolution) {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
        {RESOLUTION_LABEL[ex.resolution] ?? ex.resolution}
      </Badge>
    )
  }
  return <Badge variant="outline" className="border-red-400 text-red-700">Từ chối</Badge>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function truncate(s: string, n = 80) {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return toISODate(d)
}

function defaultTo(): string {
  return toISODate(new Date())
}

// ── Searchable combobox for container / customer dropdowns ──────────────────

interface SearchableComboboxProps {
  id?: string
  value: string
  placeholder: string
  allLabel: string
  options: { id: string; label: string }[]
  onChange: (id: string | undefined) => void
}

function SearchableCombobox({
  id,
  value,
  placeholder,
  allLabel,
  options,
  onChange,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, search])

  const selectedLabel = value ? (options.find((o) => o.id === value)?.label ?? value) : allLabel

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => {
          setOpen((p) => !p)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border">
            <button
              type="button"
              onClick={() => { onChange(undefined); setOpen(false); setSearch('') }}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent', !value && 'bg-accent/60')}
            >
              <Check className={cn('size-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')} />
              {allLabel}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Không tìm thấy.</p>
            ) : filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); setSearch('') }}
                className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent', value === o.id && 'bg-accent/60')}
              >
                <Check className={cn('size-4 shrink-0', value === o.id ? 'opacity-100' : 'opacity-0')} />
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoadingExceptionsQueuePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <QueueShell />
    </Suspense>
  )
}

function QueueShell() {
  const { getParam, setParam } = usePageParams()

  const status = (getParam('status') as StatusFilter | undefined) ?? 'pending'
  const containerId = getParam('container_id') ?? ''
  const customerId = getParam('customer_id') ?? ''
  const exceptionType = getParam('exception_type') ?? ''
  const fromDate = getParam('from') ?? defaultFrom()
  const toDate = getParam('to') ?? defaultTo()

  const filter = useMemo<ListGlobalExceptionsFilter>(
    () => ({
      status: status === 'all' ? undefined : status,
      container_id: containerId || undefined,
      customer_id: customerId || undefined,
      exception_type: exceptionType || undefined,
      // RFC3339 — let the BE inclusive/exclusive boundary handle the rest.
      from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
      to: toDate ? `${toDate}T00:00:00Z` : undefined,
      limit: 50,
    }),
    [status, containerId, customerId, exceptionType, fromDate, toDate],
  )

  const { data, isLoading, isError, refetch, isFetching } =
    useGlobalLoadingExceptions(filter)
  const { data: summary } = useLoadingExceptionsSummary({
    container_id: filter.container_id,
    customer_id: filter.customer_id,
    exception_type: filter.exception_type,
    from: filter.from,
    to: filter.to,
  })

  const exceptions = data?.items ?? []

  // Selection only makes sense for pending rows; bulk-approve mutates pending → approved.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const selectableIds = useMemo(
    () => exceptions.filter((ex) => !ex.approved_by).map((ex) => ex.id),
    [exceptions],
  )
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  const toggleAll = (next: boolean) => {
    if (next) {
      setSelected(new Set(selectableIds))
    } else {
      setSelected(new Set())
    }
  }
  const toggleOne = (id: string, next: boolean) => {
    setSelected((prev) => {
      const out = new Set(prev)
      if (next) {
        out.add(id)
      } else {
        out.delete(id)
      }
      return out
    })
  }

  // Containers and customers for filter dropdowns. We keep the list small —
  // the BE doesn't expose a paginated typeahead yet, so we cap to the most
  // recent 200 containers (default ordering).
  const { data: customersList } = useCustomers({ limit: 200 })
  const { data: containersList } = useContainers({ limit: 200 })

  const containerCodeById = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of containersList?.items ?? []) map.set(c.id, c.code)
    return map
  }, [containersList?.items])

  const containerOptions = useMemo(
    () => (containersList?.items ?? []).map((c) => ({ id: c.id, label: c.code })),
    [containersList?.items],
  )
  const customerOptions = useMemo(
    () => (customersList?.items ?? []).map((c) => ({ id: c.id, label: c.name ?? c.code })),
    [customersList?.items],
  )

  const [openExpansion, setOpenExpansion] = useState<string | null>(null)
  const [actionTarget, setActionTarget] = useState<LoadingException | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const bulkSelectedExceptions = useMemo(
    () => exceptions.filter((ex) => selected.has(ex.id)),
    [exceptions, selected],
  )
  const bulkContainerIds = useMemo(
    () =>
      Array.from(
        new Set(bulkSelectedExceptions.map((ex) => ex.container_id)),
      ),
    [bulkSelectedExceptions],
  )

  const resetFilters = () => {
    setParam('status', 'pending')
    setParam('container_id', undefined)
    setParam('customer_id', undefined)
    setParam('exception_type', undefined)
    setParam('from', undefined)
    setParam('to', undefined)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">Sự cố đóng hàng</h1>
            <p className="text-sm text-muted-foreground">
              Hàng đợi cross-container — duyệt batch hoặc xử lý từng dòng.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Tải lại
        </Button>
      </header>

      {/* Pinned counter */}
      <Card className={summary && summary.pending_count > 0 ? 'border-amber-300 bg-amber-50' : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Inbox className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm">
                <span className="text-2xl font-bold tabular-nums">
                  {summary?.pending_count ?? 0}
                </span>{' '}
                exception đang chờ duyệt
                {summary && summary.blocked_containers > 0 && (
                  <span className="text-muted-foreground">
                    {' '}· block <strong>{summary.blocked_containers}</strong> container chưa seal
                  </span>
                )}
              </p>
            </div>
          </div>

          {summary && summary.pending_count > 0 && status !== 'pending' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setParam('status', 'pending')}
            >
              Lọc theo pending
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Filter row */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Filter className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm">Bộ lọc</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={resetFilters}
          >
            Reset
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="status" className="text-xs">Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(v) => setParam('status', v === 'all' ? undefined : v)}
            >
              <SelectTrigger id="status" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
                <SelectItem value="all">Tất cả</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="container" className="text-xs">Container</Label>
            <SearchableCombobox
              id="container"
              value={containerId}
              placeholder="Tìm container..."
              allLabel="Tất cả container"
              options={containerOptions}
              onChange={(v) => setParam('container_id', v)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="customer" className="text-xs">Khách hàng</Label>
            <SearchableCombobox
              id="customer"
              value={customerId}
              placeholder="Tìm khách hàng..."
              allLabel="Tất cả khách"
              options={customerOptions}
              onChange={(v) => setParam('customer_id', v)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="type" className="text-xs">Loại exception</Label>
            <Select
              value={exceptionType || 'ALL'}
              onValueChange={(v) =>
                setParam('exception_type', v === 'ALL' ? undefined : v)
              }
            >
              <SelectTrigger id="type" className="h-9">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                {LOADING_EXCEPTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">Từ ngày</Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="from"
                type="date"
                className="h-9 pl-7"
                value={fromDate}
                onChange={(e) => setParam('from', e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">Đến ngày</Label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="to"
                type="date"
                className="h-9 pl-7"
                value={toDate}
                onChange={(e) => setParam('to', e.target.value || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      {someSelected && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">
            Đã chọn <strong>{selected.size}</strong> dòng
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Bỏ chọn
            </Button>
            <RoleGate min="PLANNER">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (selected.size > 50) {
                    toast.error('Tối đa 50 exception/lần.')
                    return
                  }
                  setBulkOpen(true)
                }}
              >
                Duyệt hàng loạt
              </Button>
            </RoleGate>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="p-6 text-center text-sm text-destructive">
              Không thể tải hàng đợi exception.
            </p>
          ) : exceptions.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Không có exception nào khớp bộ lọc.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      disabled={selectableIds.length === 0}
                      aria-label="Chọn tất cả pending"
                    />
                  </TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Lý do</TableHead>
                  <TableHead className="text-center">Ảnh</TableHead>
                  <TableHead>Tạo lúc</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((ex) => {
                  const isExpanded = openExpansion === ex.id
                  const containerCode =
                    containerCodeById.get(ex.container_id) ??
                    `…${ex.container_id.slice(-6)}`
                  const isPending = !ex.approved_by
                  return (
                    <Fragment key={ex.id}>
                      <TableRow
                        className={isPending ? 'bg-amber-50/50' : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selected.has(ex.id)}
                            onCheckedChange={(v) => toggleOne(ex.id, v === true)}
                            disabled={!isPending}
                            aria-label={`Chọn exception ${ex.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/containers/${ex.container_id}/reconciliation`}
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            <ContainerIcon className="size-3" />
                            {containerCode}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TYPE_BADGE_VARIANT[ex.exception_type] ?? 'outline'}>
                            {TYPE_LABEL[ex.exception_type] ?? ex.exception_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {typeof ex.qty === 'number' && ex.qty > 0 ? ex.qty : '—'}
                        </TableCell>
                        <TableCell className="max-w-xs text-sm">
                          {truncate(ex.reason)}
                        </TableCell>
                        <TableCell className="text-center">
                          {ex.photo_urls && ex.photo_urls.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ImageIcon className="size-3.5" />
                              {ex.photo_urls.length}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(ex.created_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge ex={ex} />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setOpenExpansion(isExpanded ? null : ex.id)
                            }
                          >
                            {isExpanded ? 'Thu' : 'Mở'}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={`${ex.id}-detail`} className="bg-muted/30">
                          <TableCell colSpan={9}>
                            <div className="space-y-3 p-3">
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground">
                                  Lý do đầy đủ
                                </p>
                                <p className="mt-1 text-sm">{ex.reason}</p>
                              </div>

                              {ex.resolution_notes && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Ghi chú resolution
                                  </p>
                                  <p className="mt-1 text-sm">
                                    {ex.resolution_notes}
                                  </p>
                                </div>
                              )}

                              {ex.photo_urls && ex.photo_urls.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                                    Ảnh ({ex.photo_urls.length})
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    {ex.photo_urls.map((url, i) => (
                                      <a
                                        key={url}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block size-20 overflow-hidden rounded-md border bg-muted/30"
                                        title={`Ảnh ${i + 1}`}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={url}
                                          alt={`Ảnh ${i + 1}`}
                                          className="size-full object-cover"
                                          loading="lazy"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {isPending && (
                                <RoleGate min="PLANNER">
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      onClick={() => setActionTarget(ex)}
                                    >
                                      Xử lý exception
                                    </Button>
                                  </div>
                                </RoleGate>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {data?.has_more && (
            <div className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
              Còn nhiều dòng — thu hẹp bộ lọc để xem.
            </div>
          )}
        </CardContent>
      </Card>

      <ApproveExceptionDialog
        exception={actionTarget}
        containerId={actionTarget?.container_id ?? ''}
        onCompleted={() => setActionTarget(null)}
        onCancel={() => setActionTarget(null)}
      />

      <BulkApproveDialog
        open={bulkOpen}
        ids={Array.from(selected)}
        containerIds={bulkContainerIds}
        onCompleted={() => {
          setBulkOpen(false)
          setSelected(new Set())
        }}
        onCancel={() => setBulkOpen(false)}
      />
    </div>
  )
}

// Used by parent to suppress 'LoadingExceptionType is unused' lint warnings —
// the import keeps the union name discoverable from this entry file.
export type { LoadingExceptionType }
