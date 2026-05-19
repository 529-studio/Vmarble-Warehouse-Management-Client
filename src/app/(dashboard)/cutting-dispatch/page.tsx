'use client'

import { Suspense, useMemo, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Scissors, UserCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
import { DataPagination } from '@/components/ui/data-pagination'
import {
  DateRangeFilter,
  defaultFromIso,
  isoToday,
} from '@/components/dashboard/date-range-filter'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { useWorkOrders,
  useAssignWorkOrder,
  useSuggestAssignment,
} from '@/lib/hooks/use-work-orders'
import { useUsers } from '@/lib/hooks/use-users'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { WorkOrder, WorkOrderStatus } from '@/types/api'

// ── Helpers

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Kế hoạch',
  IN_CUTTING: 'Đang cắt',
  IN_PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  COSTED: 'Đã tính giá',
}

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_CUTTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROCESSING: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  COSTED: 'bg-purple-100 text-purple-800 border-purple-200',
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Assign Dialog ─────────────────────────────────────────────────────────────

interface AssignDialogProps {
  wo: WorkOrder | null
  onClose: () => void
  onAssigned?: (woId: string, workerLabel: string, isReassign: boolean) => void
}

function AssignDialog({ wo, onClose, onAssigned }: AssignDialogProps) {
  const [userId, setUserId] = useState('')
  const [suggestedUserId, setSuggestedUserId] = useState<string | null>(null)
  const [suggestedCount, setSuggestedCount] = useState<number | null>(null)

  const { data: usersData, isLoading: loadingUsers } = useUsers({ role: 'cnc', limit: 200 })
  const workers = useMemo(() => usersData?.items ?? [], [usersData?.items])

  const { mutate: assign, isPending: assigning } = useAssignWorkOrder()
  const { mutate: suggest, isPending: suggesting } = useSuggestAssignment()

  if (!wo) return null

  const isReassign = !!wo.assigned_to
  const currentWorker = workers.find((w) => w.id === wo.assigned_to)

  function handleSuggest() {
    suggest(wo!.id, {
      onSuccess: (result) => {
        setSuggestedUserId(result.user_id)
        setSuggestedCount(result.in_cutting_count)
        setUserId(result.user_id)
      },
      onError: (err) => {
        if (err instanceof ApiClientError && err.status === 404) {
          toast.error('Backend chưa hỗ trợ API gợi ý công nhân CNC')
          return
        }
        toast.error(mapApiErrorVi(err, 'Không tìm được công nhân phù hợp'))
      },
    })
  }

  function handleAssign() {
    if (!userId) {
      toast.error('Chọn công nhân CNC')
      return
    }
    const targetWorker = workers.find((w) => w.id === userId)
    const workerLabel = targetWorker?.full_name ?? targetWorker?.username ?? 'công nhân'
    assign(
      { id: wo!.id, input: { user_id: userId } },
      {
        onSuccess: () => {
          toast.success(
            isReassign
              ? `Đã phân công lại ${shortId(wo!.id)} cho ${workerLabel}`
              : `Đã điều phối ${shortId(wo!.id)} cho ${workerLabel}`,
          )
          onAssigned?.(wo!.id, workerLabel, isReassign)
          onClose()
        },
        onError: (err) => {
          if (err instanceof ApiClientError && err.status === 412) {
            toast.error('Lệnh đã chuyển sang trạng thái đang cắt, không thể phân công lại')
          } else {
            toast.error(mapApiErrorVi(err, 'Phân công thất bại'))
          }
        },
      },
    )
  }

  function handleClose() {
    setUserId('')
    setSuggestedUserId(null)
    setSuggestedCount(null)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isReassign ? 'Phân công lại lệnh cắt' : 'Phân công lệnh cắt'}
            <span className="ml-2 font-mono text-sm text-muted-foreground">{shortId(wo.id)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* WO summary — highlights the target so bulk-dispatch can't mis-assign */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Mã lệnh:</span> <span className="font-mono font-medium">{shortId(wo.id)}</span></p>
            <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{wo.sku_code ?? '—'}</span>{wo.sku_name ? <span className="text-muted-foreground"> · {wo.sku_name}</span> : null}</p>
            <p>
              <span className="text-muted-foreground">Số lượng:</span>{' '}
              <span className="font-medium">{wo.quantity.toLocaleString('vi-VN')}</span>
              {wo.sku_dimensions && (
                <>
                  <span className="mx-1 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">KT:</span>{' '}
                  <span className="font-medium">
                    {wo.sku_dimensions.length_mm} × {wo.sku_dimensions.width_mm} mm
                  </span>
                </>
              )}
            </p>
            {isReassign && currentWorker && (
              <p>
                <span className="text-muted-foreground">Đang phân công:</span>{' '}
                <span className="font-medium">{currentWorker.full_name ?? currentWorker.username}</span>
              </p>
            )}
          </div>

          {/* Worker dropdown */}
          <div className="space-y-1.5">
            <Label>Công nhân CNC *</Label>
            <div className="flex gap-2">
              <Select value={userId} onValueChange={setUserId} disabled={loadingUsers}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={loadingUsers ? 'Đang tải…' : '— Chọn công nhân —'} />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <span>{w.full_name ?? w.username}</span>
                      {suggestedUserId === w.id && suggestedCount !== null && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({suggestedCount} lệnh đang cắt)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSuggest}
                disabled={suggesting}
                title="Gợi ý công nhân ít việc nhất"
              >
                <Sparkles className="size-4" />
              </Button>
            </div>
            {suggestedCount !== null && userId === suggestedUserId && (
              <p className="text-xs text-muted-foreground">
                Gợi ý: công nhân đang có {suggestedCount} lệnh cắt
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assigning}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={assigning || !userId}>
            {assigning
              ? 'Đang phân công…'
              : isReassign
                ? `Phân công lại ${shortId(wo.id)}`
                : `Phân công ${shortId(wo.id)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

type AssignmentFilter = 'unassigned' | 'recent' | 'all'

const RECENT_DISPATCH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes — matches DoD §2
const PULSE_DURATION_MS = 5_000 // row pulse duration after dispatch

function CuttingDispatchContent() {
  const role = useCurrentRole()
  const canAssignWorkOrder = can(role, 'assign', 'cutting_dispatch')

  // Default view mirrors BE precondition (`production/service.go:199`): only
  // PLANNED + unassigned WOs are dispatchable, so the operator-friendly
  // landing matches that shape. Reviewers can still toggle to other statuses.
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('PLANNED')
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>('unassigned')
  const [assignTarget, setAssignTarget] = useState<WorkOrder | null>(null)
  // Tracks WOs dispatched in this session so we can pulse the row and let the
  // operator immediately confirm the dispatch landed (#187). pulseIds drives
  // the 5s row highlight; recentIds drives the 5-minute "Vừa điều phối" tab.
  const [pulseIds, setPulseIds] = useState<Set<string>>(() => new Set())
  const [recentIds, setRecentIds] = useState<Set<string>>(() => new Set())

  const { page, limit, setPage, getParam, setParams } = usePageParams(15)

  const dateFrom = getParam('from') ?? defaultFromIso()
  const dateTo = getParam('to') ?? isoToday()

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(assignmentFilter === 'unassigned' ? { assigned: 'null' as const } : {}),
    from: dateFrom,
    to: dateTo,
    page,
    limit,
  }

  const { data, isLoading, isFetching, isError } = useWorkOrders(filter)
  // Defensive client-side filter: if the backend ignores `assigned=null`
  // (Spec §5.1 notes the param is pending BE confirmation), fall back to
  // filtering the page in the client so the UX promise still holds.
  const workOrders = useMemo(() => {
    const items = data?.items ?? []
    if (assignmentFilter === 'unassigned') {
      return items.filter((wo) => !wo.assigned_to)
    }
    if (assignmentFilter === 'recent') {
      // Only show WOs dispatched in this browser session — keeps render pure
      // (no Date.now() in the memo) and matches the operator intent of "what
      // I just dispatched, where did it land".
      return items.filter((wo) => recentIds.has(wo.id))
    }
    return items
  }, [data?.items, assignmentFilter, recentIds])
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1
  const isDefaultDispatchView = statusFilter === 'PLANNED' && assignmentFilter === 'unassigned'

  function markRecentlyDispatched(woId: string) {
    setPulseIds((prev) => {
      const next = new Set(prev)
      next.add(woId)
      return next
    })
    setRecentIds((prev) => {
      const next = new Set(prev)
      next.add(woId)
      return next
    })
    setTimeout(() => {
      setPulseIds((prev) => {
        if (!prev.has(woId)) return prev
        const next = new Set(prev)
        next.delete(woId)
        return next
      })
    }, PULSE_DURATION_MS)
    setTimeout(() => {
      setRecentIds((prev) => {
        if (!prev.has(woId)) return prev
        const next = new Set(prev)
        next.delete(woId)
        return next
      })
    }, RECENT_DISPATCH_WINDOW_MS)
  }

  // After a dispatch the operator usually wants to verify the WO landed
  // somewhere — auto-flip to the "Vừa điều phối" tab if they were on the
  // unassigned default view, otherwise keep their current filter.
  function handleAssigned(woId: string) {
    markRecentlyDispatched(woId)
    if (assignmentFilter === 'unassigned') {
      setAssignmentFilter('recent')
      setPage(1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v as WorkOrderStatus | 'ALL'); setPage(1) }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {(Object.keys(STATUS_LABEL) as WorkOrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={assignmentFilter}
          onValueChange={(v) => { setAssignmentFilter(v as AssignmentFilter); setPage(1) }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Chưa phân công</SelectItem>
            <SelectItem value="recent">Vừa điều phối (5 phút)</SelectItem>
            <SelectItem value="all">Tất cả phân công</SelectItem>
          </SelectContent>
        </Select>

        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onChange={({ from, to }) => setParams({ from, to })}
          className="ml-auto"
        />
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading
            ? 'Đang tải…'
            : isDefaultDispatchView
              ? `Lệnh chờ điều phối (${workOrders.length})`
              : assignmentFilter === 'recent'
                ? `Vừa điều phối — 5 phút gần đây (${workOrders.length})`
                : `Lệnh cắt (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách lệnh cắt.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã Lệnh</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Phân công</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="w-28 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {isDefaultDispatchView
                      ? 'Không có lệnh nào chờ điều phối.'
                      : assignmentFilter === 'recent'
                        ? 'Chưa có lệnh nào được điều phối trong 5 phút qua.'
                        : 'Không có lệnh cắt nào.'}
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => {
                  const justDispatched = pulseIds.has(wo.id)
                  return (
                    <TableRow
                      key={wo.id}
                      className={
                        justDispatched
                          ? 'bg-yellow-50 transition-colors duration-1000 dark:bg-yellow-950/30'
                          : 'transition-colors duration-1000'
                      }
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {shortId(wo.id)}
                        {justDispatched && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                            Vừa điều phối
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.sku_code ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_CLASS[wo.status]}>
                          {STATUS_LABEL[wo.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {wo.assigned_to ? (
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="size-3.5 text-green-500 shrink-0" />
                            {shortId(wo.assigned_to)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Chưa phân công</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(wo.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {wo.status === 'PLANNED' && canAssignWorkOrder && (
                          <Button
                            size="sm"
                            variant={wo.assigned_to ? 'outline' : 'default'}
                            onClick={() => setAssignTarget(wo)}
                          >
                            {wo.assigned_to ? 'Phân công lại' : 'Phân công'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && !isError && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {canAssignWorkOrder && (
        <AssignDialog
          wo={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={(woId) => handleAssigned(woId)}
        />
      )}
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function CuttingDispatchPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Scissors className="size-6 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Điều phối cắt CNC</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <CuttingDispatchContent />
      </Suspense>
    </div>
  )
}
