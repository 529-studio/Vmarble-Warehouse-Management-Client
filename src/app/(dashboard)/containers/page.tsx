'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Container as ContainerIcon, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useVessels } from '@/lib/hooks/use-vessels'
import { isAtLeast, usePersona } from '@/lib/auth/persona'
import {
  isAutoTransition,
  planTransition,
  type LifecycleAction,
} from '@/lib/delivery/transitions'
import { CreateContainerDialog } from '@/components/containers/create-container-dialog'
import { LifecycleDialog } from '@/components/containers/lifecycle-dialog'
import { useUsers } from '@/lib/hooks/use-users'
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

// Pure card visual — used by DraggableCard and DragOverlay
function ContainerCardContent({ container, loaderName }: { container: Container; loaderName?: string }) {
  const cbmPct = container.fill_pct_cbm ?? 0
  const massPct = container.fill_pct_mass ?? 0
  return (
    <Card className="bg-white">
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
        {loaderName && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="shrink-0">👤</span>
            <span className="truncate">{loaderName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DraggableCard({
  container,
  draggable,
  loaderName,
}: {
  container: Container
  draggable: boolean
  loaderName?: string
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: container.id,
    data: { from: container.status },
    disabled: !draggable,
  })

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        {...(draggable ? listeners : {})}
        {...attributes}
        className="h-[130px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/5"
        aria-hidden
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...attributes}
    >
      <Link
        href={`/containers/${container.id}/loading`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
        onClick={(e) => {
          if (isDragging) e.preventDefault()
        }}
      >
        <div className={`rounded-lg transition-shadow hover:shadow-md ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
          <ContainerCardContent container={container} loaderName={loaderName} />
        </div>
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
  const loaderFilter = getParam('loader_id') ?? 'ALL'
  const vesselFilter = getParam('vessel_id') ?? 'ALL'

  const { data: usersData } = useUsers({ limit: 200 })
  const loaders = usersData?.items ?? []
  const userMap = useMemo(
    () => new Map(loaders.map((u) => [u.id, u.full_name ?? u.username])),
    [loaders],
  )

  const { data: vesselsData } = useVessels({ limit: 200 })
  const vessels = vesselsData?.items ?? []

  const { data, isLoading, isError } = useContainers({
    limit: 100,
    search: debouncedSearch || undefined,
    container_type: containerType === 'ALL' ? undefined : containerType,
    loader_id: loaderFilter === 'ALL' ? undefined : loaderFilter === '__unassigned__' ? 'null' : loaderFilter,
    vessel_id: vesselFilter === 'ALL' ? undefined : vesselFilter,
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingDialog | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const activeContainer = useMemo(
    () => (activeId ? containers.find((c) => c.id === activeId) ?? null : null),
    [activeId, containers],
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setOverColumn(null)
    setActiveId(null)
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

        <Select
          value={loaderFilter}
          onValueChange={(v) => setParam('loader_id', v === 'ALL' ? undefined : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Người xếp hàng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="__unassigned__">Chưa gán</SelectItem>
            {loaders.filter((u) => u.is_active).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={vesselFilter}
          onValueChange={(v) => setParam('vessel_id', v === 'ALL' ? undefined : v)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tàu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả tàu</SelectItem>
            {vessels.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} — {v.voyage_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {isLoading ? 'Đang tải…' : `${containers.length} container`}
        </span>
        {isAtLeast(persona, 'PLANNER') && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Tạo container
          </Button>
        )}
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách container.</p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={(e) => {
            const to = e.over?.data.current?.to as ContainerStatus | undefined
            setOverColumn(to ?? null)
          }}
          onDragCancel={() => { setOverColumn(null); setActiveId(null) }}
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
                        draggable={c.status !== 'SHIPPED' && c.status !== 'CANCELLED'}
                        loaderName={c.loader_id ? userMap.get(c.loader_id) : undefined}
                      />
                    ))
                  )}
                </DroppableColumn>
              )
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
            {activeContainer ? (
              <div className="rotate-1 scale-105 opacity-95 shadow-2xl rounded-lg cursor-grabbing">
                <ContainerCardContent container={activeContainer} />
              </div>
            ) : null}
          </DragOverlay>
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
      <CreateContainerDialog open={createOpen} onClose={() => setCreateOpen(false)} />
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
