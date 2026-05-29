'use client'

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ChevronDown, ChevronRight, FileWarning, Pencil } from 'lucide-react'
import Image from 'next/image'
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
import { Textarea } from '@/components/ui/textarea'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { mapApiErrorVi } from '@/lib/api/client'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { formatVND } from '@/lib/format'
import {
  useMaterialRejections,
  useUpdateClaim,
} from '@/lib/hooks/use-material-rejections'
import {
  CLAIM_STATUSES,
  type ClaimStatus,
  type MaterialRejection,
  type UpdateClaimInput,
} from '@/types/api'

const ALL_STATUSES = '__all__'

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

const STATUS_LABEL: Record<ClaimStatus, string> = {
  OPEN: 'Mới',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PAID: 'Đã thanh toán',
}

const STATUS_CLASS: Record<ClaimStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  PAID: 'bg-green-100 text-green-800 border-green-200',
}

/** Allowed transitions per BR-INV05. Mirrors BE; FE gates the dropdown. */
const NEXT_STATUSES: Record<ClaimStatus, ClaimStatus[]> = {
  OPEN: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: [],
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as string[]).includes(value)
}

// ── Money input ─────────────────────────────────────────────────────────────

interface MoneyInputProps {
  id: string
  value: number
  onChange: (value: number) => void
  ariaInvalid?: boolean
}

function MoneyInput({ id, value, onChange, ariaInvalid }: MoneyInputProps) {
  const display = value > 0 ? value.toLocaleString('vi-VN') : ''
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        aria-invalid={ariaInvalid || undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '')
          onChange(digits ? Number(digits) : 0)
        }}
        className="pr-12"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        VND
      </span>
    </div>
  )
}

// ── Photo gallery (read-only) ───────────────────────────────────────────────

function PhotoGallery({ urls }: { urls?: string[] }) {
  if (!urls || urls.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Không có ảnh đính kèm.</p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative size-20 overflow-hidden rounded border bg-muted/30 transition-opacity hover:opacity-80"
        >
          <Image
            src={url}
            alt="Ảnh khiếu nại"
            fill
            sizes="80px"
            unoptimized
            className="object-cover"
          />
        </a>
      ))}
    </div>
  )
}

// ── Update-claim modal ──────────────────────────────────────────────────────

interface UpdateClaimDialogProps {
  rejection: MaterialRejection | null
  onClose: () => void
}

function UpdateClaimDialog({ rejection, onClose }: UpdateClaimDialogProps) {
  const { mutate, isPending } = useUpdateClaim()

  const currentStatus: ClaimStatus = isClaimStatus(rejection?.claim_status ?? '')
    ? (rejection!.claim_status as ClaimStatus)
    : 'OPEN'
  const allowed = NEXT_STATUSES[currentStatus]

  const [nextStatus, setNextStatus] = useState<ClaimStatus | ''>('')
  const [claimAmount, setClaimAmount] = useState(rejection?.claim_amount ?? 0)
  const [resolutionNotes, setResolutionNotes] = useState(
    rejection?.resolution_notes ?? '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset local state when the dialog opens for a different row.
  const openId = rejection?.id ?? null
  useEffect(() => {
    setNextStatus('')
    setClaimAmount(rejection?.claim_amount ?? 0)
    setResolutionNotes(rejection?.resolution_notes ?? '')
    setErrors({})
    // The row identity drives the reset; field values are read from the
    // freshly-opened row inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!nextStatus) next.status = 'Chọn trạng thái mới'
    if (
      (nextStatus === 'APPROVED' || nextStatus === 'PAID') &&
      (!claimAmount || claimAmount <= 0)
    ) {
      next.claim_amount = 'Số tiền khiếu nại phải lớn hơn 0'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    if (!rejection || !validate() || !nextStatus) return
    const body: UpdateClaimInput = {
      claim_status: nextStatus,
      ...(nextStatus !== 'REJECTED'
        ? { claim_amount: claimAmount, claim_currency: 'VND' }
        : {}),
      ...(resolutionNotes.trim() ? { resolution_notes: resolutionNotes.trim() } : {}),
    }
    mutate(
      { id: rejection.id, body },
      { onSuccess: onClose },
    )
  }

  const open = !!rejection

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật khiếu nại</DialogTitle>
        </DialogHeader>

        {rejection && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="text-muted-foreground">Lô vật liệu</div>
              <div className="font-mono text-xs">{rejection.lot_id}</div>
              <div className="mt-2 text-muted-foreground">Lý do</div>
              <div>
                <span className="font-medium">{rejection.reason_code}</span>
                {rejection.reason_detail ? ` — ${rejection.reason_detail}` : ''}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="claim-status">Trạng thái mới *</Label>
              <Select
                value={nextStatus}
                onValueChange={(v) => setNextStatus(v as ClaimStatus)}
                disabled={allowed.length === 0}
              >
                <SelectTrigger id="claim-status" aria-invalid={!!errors.status}>
                  <SelectValue
                    placeholder={
                      allowed.length === 0
                        ? 'Trạng thái cuối — không thể cập nhật'
                        : 'Chọn trạng thái'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {allowed.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-destructive">{errors.status}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Hiện tại: <span className="font-medium">{STATUS_LABEL[currentStatus]}</span>
              </p>
            </div>

            {nextStatus !== 'REJECTED' && (
              <div className="space-y-1">
                <Label htmlFor="claim-amount">Số tiền khiếu nại *</Label>
                <MoneyInput
                  id="claim-amount"
                  value={claimAmount}
                  onChange={setClaimAmount}
                  ariaInvalid={!!errors.claim_amount}
                />
                {errors.claim_amount && (
                  <p className="text-xs text-destructive">{errors.claim_amount}</p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="claim-notes">Ghi chú xử lý</Label>
              <Textarea
                id="claim-notes"
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Tuỳ chọn"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || allowed.length === 0}
          >
            {isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page content ────────────────────────────────────────────────────────────

function MaterialRejectionsContent() {
  const role = useCurrentRole()
  const canRead = can(role, 'read', 'material_rejections')
  const canApprove = can(role, 'approve', 'material_rejections')

  const [statusFilter, setStatusFilter] = useState<ClaimStatus | typeof ALL_STATUSES>(
    ALL_STATUSES,
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<MaterialRejection | null>(null)

  const filter = useMemo(
    () => ({
      ...(statusFilter !== ALL_STATUSES ? { claim_status: statusFilter } : {}),
      limit: 50,
    }),
    [statusFilter],
  )

  const list = useMaterialRejections(canRead ? filter : {})
  const rows = list.items as MaterialRejection[]

  if (!canRead) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
        Bạn không có quyền xem trang này.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(isClaimStatus(v) ? v : ALL_STATUSES)
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>Tất cả trạng thái</SelectItem>
            {CLAIM_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div
        className={`rounded-lg border transition-opacity ${
          list.isFetching && !list.isLoading ? 'opacity-60' : ''
        }`}
      >
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {list.isLoading ? 'Đang tải…' : `Khiếu nại NCC (${rows.length})`}
        </div>

        {list.isError ? (
          <p className="p-4 text-sm text-destructive">
            {mapApiErrorVi(list.error, 'Không thể tải danh sách khiếu nại.')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Ngày báo lỗi</TableHead>
                <TableHead>Lô vật liệu</TableHead>
                <TableHead>Lý do</TableHead>
                <TableHead className="text-right">SL trả</TableHead>
                <TableHead className="text-right">Số tiền KN</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-24 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Chưa có khiếu nại nào.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isOpen = !!expanded[row.id]
                  const status: ClaimStatus = isClaimStatus(row.claim_status)
                    ? row.claim_status
                    : 'OPEN'
                  const canEdit = canApprove && NEXT_STATUSES[status].length > 0
                  return (
                    <RejectionRow
                      key={row.id}
                      row={row}
                      status={status}
                      isOpen={isOpen}
                      canEdit={canEdit}
                      onToggle={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [row.id]: !prev[row.id],
                        }))
                      }
                      onEdit={() => setEditing(row)}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <LoadMoreButton
        hasMore={list.hasMore}
        isFetching={list.isFetchingNextPage}
        onClick={list.fetchNextPage}
        itemCount={rows.length}
      />

      <UpdateClaimDialog rejection={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

interface RejectionRowProps {
  row: MaterialRejection
  status: ClaimStatus
  isOpen: boolean
  canEdit: boolean
  onToggle: () => void
  onEdit: () => void
}

function RejectionRow({
  row,
  status,
  isOpen,
  canEdit,
  onToggle,
  onEdit,
}: RejectionRowProps) {
  return (
    <>
      <TableRow>
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0"
            onClick={onToggle}
            aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(row.reported_at)}
        </TableCell>
        <TableCell className="font-mono text-xs">
          {row.lot_id.slice(0, 8)}…
        </TableCell>
        <TableCell>
          <span className="font-medium">{row.reason_code}</span>
          {row.reason_detail && (
            <span className="ml-1 text-muted-foreground">— {row.reason_detail}</span>
          )}
        </TableCell>
        <TableCell className="text-right">{row.rejected_qty_sheets}</TableCell>
        <TableCell className="text-right">
          {row.claim_amount > 0 ? formatVND(row.claim_amount) : '—'}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={STATUS_CLASS[status]}>
            {STATUS_LABEL[status]}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3" />
              Cập nhật
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/20">
            <div className="space-y-3 px-2 py-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Lô đầy đủ:</span>{' '}
                  <span className="font-mono">{row.lot_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Người báo:</span>{' '}
                  <span className="font-mono">{row.reported_by.slice(0, 8)}…</span>
                </div>
                {row.resolved_at && (
                  <div>
                    <span className="text-muted-foreground">Đã xử lý:</span>{' '}
                    {formatDate(row.resolved_at)}
                  </div>
                )}
                {row.resolved_by && (
                  <div>
                    <span className="text-muted-foreground">Người xử lý:</span>{' '}
                    <span className="font-mono">{row.resolved_by.slice(0, 8)}…</span>
                  </div>
                )}
              </div>
              {row.resolution_notes && (
                <div className="text-xs">
                  <div className="text-muted-foreground">Ghi chú xử lý:</div>
                  <p className="whitespace-pre-wrap">{row.resolution_notes}</p>
                </div>
              )}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Ảnh đính kèm</div>
                <PhotoGallery urls={row.photo_urls} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Page shell ──────────────────────────────────────────────────────────────

export default function MaterialRejectionsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <FileWarning className="size-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold">Khiếu nại NCC</h1>
          <p className="text-sm text-muted-foreground">
            Lô vật liệu nhập lỗi — theo dõi tiến trình khiếu nại nhà cung cấp (BR-INV02–06).
          </p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <MaterialRejectionsContent />
      </Suspense>
    </div>
  )
}
