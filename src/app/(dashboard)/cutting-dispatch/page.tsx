'use client'

import { Suspense, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
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
import { usePageParams } from '@/lib/hooks/use-page-params'
import {
  useWorkOrders,
  useAssignWorkOrder,
  useSuggestAssignment,
} from '@/lib/hooks/use-work-orders'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { WorkOrder, WorkOrderStatus } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  suggestedWorkerName?: string | null
  suggestedWorkerUsername?: string | null
  onSuggestedUserMetaChange?: (meta: { userId: string; username?: string | null; fullName?: string | null }) => void
  onClose: () => void
}

function AssignDialog({ wo, suggestedWorkerName, suggestedWorkerUsername, onSuggestedUserMetaChange, onClose }: AssignDialogProps) {
  const [userId, setUserId] = useState('')
  const [suggestedCount, setSuggestedCount] = useState<number | null>(null)
  const [suggestedUserId, setSuggestedUserId] = useState<string | null>(null)

  const suggestedWorkerLabel = suggestedWorkerName
    ?? (suggestedUserId ? `Công nhân ${shortId(suggestedUserId)}` : null)
  const suggestedUsernameLabel = suggestedWorkerUsername
    ?? (suggestedUserId ? shortId(suggestedUserId) : null)

  const { mutate: assign, isPending: assigning } = useAssignWorkOrder()
  const { mutate: suggest, isPending: suggesting } = useSuggestAssignment()

  if (!wo) return null

  function handleSuggest() {
    suggest(wo!.id, {
      onSuccess: (result) => {
        setUserId(result.user_id)
        setSuggestedUserId(result.user_id)
        setSuggestedCount(result.in_cutting_count)
        onSuggestedUserMetaChange?.({
          userId: result.user_id,
          username: result.username,
          fullName: result.full_name,
        })
      },
      onError: (err) => {
        if (
          err instanceof ApiClientError
          && err.status === 404
          && err.message === 'HTTP 404'
        ) {
          toast.error('Backend chưa hỗ trợ API gợi ý công nhân CNC')
          return
        }
        toast.error(mapApiErrorVi(err, 'Không tìm được công nhân phù hợp'))
      },
    })
  }

  function handleAssign() {
    if (!userId.trim()) {
      toast.error('Nhập ID công nhân CNC')
      return
    }
    assign(
      { id: wo!.id, input: { user_id: userId.trim() } },
      {
        onSuccess: () => {
          toast.success(`Đã phân công lệnh ${shortId(wo!.id)}`)
          onClose()
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
          <DialogTitle>Phân công lệnh cắt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* WO summary */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Mã lệnh:</span> <span className="font-mono font-medium">{shortId(wo.id)}</span></p>
            <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{wo.sku_code ?? '—'}</span></p>
            <p><span className="text-muted-foreground">Trạng thái:</span>{' '}
              <Badge variant="outline" className={STATUS_CLASS[wo.status]}>
                {STATUS_LABEL[wo.status]}
              </Badge>
            </p>
          </div>

          {/* Worker ID input */}
          <div className="space-y-1.5">
            <Label htmlFor="worker-id">ID Công nhân CNC *</Label>
            <div className="flex gap-2">
              <Input
                id="worker-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID công nhân"
                className="flex-1 font-mono text-sm"
              />
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
            {suggestedCount !== null && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p>
                  Gợi ý công nhân: <span className="font-medium text-foreground">{suggestedWorkerLabel ?? 'Chưa có tên hiển thị'}</span>
                </p>
                <p>
                  Username: <span className="font-mono">{suggestedUsernameLabel ?? '—'}</span>
                </p>
                <p>
                  Tải hiện tại: {suggestedCount} lệnh đang cắt
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assigning}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={assigning || !userId.trim()}>
            {assigning ? 'Đang phân công…' : 'Phân công'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function CuttingDispatchContent() {
  const role = useMemo(() => getCurrentRoleFromCookie(), [])
  const canAssignWorkOrder = can(role, 'assign', 'cutting_dispatch')

  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL')
  const [assignTarget, setAssignTarget] = useState<WorkOrder | null>(null)
  const [lastSuggestedUserMeta, setLastSuggestedUserMeta] = useState<{
    userId: string
    username?: string | null
    fullName?: string | null
  } | null>(null)

  const { page, limit, setPage } = usePageParams(15)

  const filter = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    page,
    limit,
  }

  const { data, isLoading, isFetching, isError } = useWorkOrders(filter)
  const workOrders = useMemo(() => data?.items ?? [], [data?.items])
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  const workerNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const wo of workOrders) {
      if (!wo.assigned_to_id || !wo.assigned_to_name) continue
      map.set(wo.assigned_to_id, wo.assigned_to_name)
    }
    return map
  }, [workOrders])

  const suggestedWorkerName = lastSuggestedUserMeta
    ? lastSuggestedUserMeta.fullName ?? workerNameById.get(lastSuggestedUserMeta.userId) ?? null
    : null

  const suggestedWorkerUsername = lastSuggestedUserMeta?.username ?? null

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
      </div>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Tất cả lệnh sản xuất (${totalItems})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải danh sách lệnh sản xuất.</p>
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
                    Không có lệnh sản xuất nào.
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {shortId(wo.id)}
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
                      {wo.assigned_to_name ? (
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="size-3.5 text-green-500 shrink-0" />
                          {wo.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Chưa phân công</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(wo.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(wo.status === 'PLANNED' || wo.status === 'IN_CUTTING') && canAssignWorkOrder && (
                        <Button
                          size="sm"
                          variant={wo.assigned_to_name ? 'outline' : 'default'}
                          onClick={() => setAssignTarget(wo)}
                        >
                          {wo.assigned_to_name ? 'Đổi phân công' : 'Phân công'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
          suggestedWorkerName={suggestedWorkerName}
          suggestedWorkerUsername={suggestedWorkerUsername}
          onSuggestedUserMetaChange={setLastSuggestedUserMeta}
          onClose={() => {
            setAssignTarget(null)
            setLastSuggestedUserMeta(null)
          }}
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
