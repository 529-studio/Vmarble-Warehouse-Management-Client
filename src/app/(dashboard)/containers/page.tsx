'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Container as ContainerIcon, Search } from 'lucide-react'
import { toast } from 'sonner'
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
import { isAtLeast, usePersona } from '@/lib/auth/persona'
import {
  isAutoTransition,
  planTransition,
  type LifecycleAction,
} from '@/lib/delivery/transitions'
import { LifecycleDialog } from '@/components/containers/lifecycle-dialog'
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

interface PendingDialog {
  action: LifecycleAction
  containerId: string
  containerCode: string
}

function DraggableCard({
  container,
  draggable,
}: {
  container: Container
  draggable: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: container.id,
    data: { from: container.status },
    disabled: !draggable,
  })

  const cbmPct = container.fill_pct_cbm ?? 0
  const massPct = container.fill_pct_mass ?? 0

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...attributes}
      className={isDragging ? 'opacity-50' : ''}
    >
      <Link
        href={`/containers/${container.id}/loading`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        // Suppress click while dragging — dnd-kit's pointer handler keeps the
        // cursor down past activation distance, and we don't want the link to
        // open after a drag-cancel.
        onClick={(e) => {
          if (isDragging) e.preventDefault()
        }}
      >
        <Card
          className={`transition-shadow hover:shadow-md ${
            draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
        >
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
      </Link>
    </div>
  )
}

function DroppableColumn({
  status,
  count,
  isLoading,
  isOver,
  children,
}: {
  status: ContainerStatus
  count: number
  isLoading: boolean
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: `col:${status}`, data: { to: status } })

  return (
    <section
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border p-3 transition-colors ${STATUS_COLUMN_CLASS[status]} ${
        isOver ? 'ring-2 ring-primary/60' : ''
      }`}
      aria-label={STATUS_LABEL[status]}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
        <Badge variant="secondary" className="bg-white">
          {isLoading ? '…' : count}
        </Badge>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
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
  const persona = usePersona()

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)
  const [prevDebounced, setPrevDebounced] = useState(debouncedSearch)
  if (prevDebounced !== debouncedSearch) {
    setPrevDebounced(debouncedSearch)
    setSearch(debouncedSearch)
  }

  const containerType = getParam('container_type') ?? 'ALL'

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

  // Pointer sensor with a small activation distance — without it, every click
  // on a card fires a drag and Radix dialog focus dies on pointercapture.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const [overColumn, setOverColumn] = useState<ContainerStatus | null>(null)
  const [pending, setPending] = useState<PendingDialog | null>(null)

  const handleDragEnd = (event: DragEndEvent) => {
    setOverColumn(null)
    const { active, over } = event
    if (!over) return

    const fromStatus = active.data.current?.from as ContainerStatus | undefined
    const toStatus = over.data.current?.to as ContainerStatus | undefined
    if (!fromStatus || !toStatus) return
    if (fromStatus === toStatus) return

    if (isAutoTransition(fromStatus, toStatus)) {
      toast.info('OPEN → LOADING tự động khi thêm dòng hàng đầu tiên.')
      return
    }

    const plan = planTransition(fromStatus, toStatus)
    if (!plan) {
      toast.error(
        `Không thể chuyển ${STATUS_LABEL[fromStatus]} → ${STATUS_LABEL[toStatus]}.`,
      )
      return
    }

    if (!isAtLeast(persona, plan.minPersona)) {
      toast.error('Bạn không có quyền thực hiện thao tác này.')
      return
    }

    const container = containers.find((c) => c.id === active.id)
    if (!container) return

    setPending({
      action: plan.action,
      containerId: container.id,
      containerCode: container.code,
    })
  }

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
        <DndContext
          sensors={sensors}
          onDragOver={(e) => {
            const to = e.over?.data.current?.to as ContainerStatus | undefined
            setOverColumn(to ?? null)
          }}
          onDragCancel={() => setOverColumn(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-3 lg:grid-cols-5">
            {CONTAINER_STATUSES.map((status) => {
              const items = buckets[status]
              return (
                <DroppableColumn
                  key={status}
                  status={status}
                  count={items.length}
                  isLoading={isLoading}
                  isOver={overColumn === status}
                >
                  {isLoading ? (
                    <ColumnSkeleton />
                  ) : items.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-white/40 p-3 text-center text-xs text-muted-foreground">
                      Chưa có container ở trạng thái này.
                    </p>
                  ) : (
                    items.map((c) => (
                      <DraggableCard
                        key={c.id}
                        container={c}
                        // SHIPPED and CANCELLED are terminal — never draggable.
                        // Everyone else can attempt; persona is rechecked on drop.
                        draggable={c.status !== 'SHIPPED' && c.status !== 'CANCELLED'}
                      />
                    ))
                  )}
                </DroppableColumn>
              )
            })}
          </div>
        </DndContext>
      )}

      <LifecycleDialog
        open={pending !== null}
        action={pending?.action ?? null}
        containerId={pending?.containerId ?? null}
        containerCode={pending?.containerCode ?? null}
        onCompleted={() => setPending(null)}
        onCancel={() => setPending(null)}
      />
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
