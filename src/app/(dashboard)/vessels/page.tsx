'use client'

import { Fragment, Suspense, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { Anchor, ChevronDown, ChevronRight, Pencil, Plus, Trash2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { DateRangeFilter } from '@/components/dashboard/date-range-filter'
import { usePageParams } from '@/lib/hooks/use-page-params'
import { useDebounce } from '@/lib/hooks/use-debounce'
import {
  useCreateVessel,
  useDeleteVessel,
  useUpdateVessel,
  useVesselContainers,
  useVessels,
} from '@/lib/hooks/use-vessels'
import type { Container, CreateVesselInput, UpdateVesselInput, Vessel } from '@/types/api'

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Mở',
  LOADING: 'Đang xếp',
  SEALED: 'Đã niêm phong',
  SHIPPED: 'Đã xuất',
  CANCELLED: 'Đã huỷ',
}

// ── Vessel form (create + edit) ──────────────────────────────────────────────

interface VesselFormState {
  name: string
  voyage_number: string
  etd: string
  eta: string
  port_of_loading: string
  port_of_discharge: string
  cutoff_date: string
  note: string
}

function emptyForm(): VesselFormState {
  return {
    name: '',
    voyage_number: '',
    etd: '',
    eta: '',
    port_of_loading: '',
    port_of_discharge: '',
    cutoff_date: '',
    note: '',
  }
}

function fromVessel(v: Vessel): VesselFormState {
  return {
    name: v.name,
    voyage_number: v.voyage_number,
    etd: toDateInput(v.etd),
    eta: toDateInput(v.eta),
    port_of_loading: v.port_of_loading,
    port_of_discharge: v.port_of_discharge,
    cutoff_date: toDateInput(v.cutoff_date),
    note: v.note ?? '',
  }
}

interface VesselDialogProps {
  open: boolean
  vessel: Vessel | null
  onClose: () => void
}

function VesselDialog({ open, vessel, onClose }: VesselDialogProps) {
  const isEdit = vessel !== null
  const [form, setForm] = useState<VesselFormState>(emptyForm)

  // Reset form when dialog opens/closes or target vessel changes
  const dialogKey = open ? (vessel?.id ?? '__new__') : ''
  const [prevKey, setPrevKey] = useState(dialogKey)
  if (prevKey !== dialogKey) {
    setPrevKey(dialogKey)
    setForm(vessel ? fromVessel(vessel) : emptyForm())
  }

  const createVessel = useCreateVessel()
  const updateVessel = useUpdateVessel(vessel?.id ?? '')

  const isPending = createVessel.isPending || updateVessel.isPending

  const set = (field: keyof VesselFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid = form.name.trim() && form.voyage_number.trim() && form.etd && form.eta && form.cutoff_date &&
    form.port_of_loading.trim() && form.port_of_discharge.trim()

  const submit = () => {
    if (!isValid || isPending) return
    if (isEdit) {
      const body: UpdateVesselInput = {
        name: form.name.trim(),
        voyage_number: form.voyage_number.trim(),
        etd: form.etd,
        eta: form.eta,
        port_of_loading: form.port_of_loading.trim(),
        port_of_discharge: form.port_of_discharge.trim(),
        cutoff_date: form.cutoff_date,
        note: form.note.trim() || undefined,
      }
      updateVessel.mutate(body, { onSuccess: onClose })
    } else {
      const body: CreateVesselInput = {
        name: form.name.trim(),
        voyage_number: form.voyage_number.trim(),
        etd: form.etd,
        eta: form.eta,
        port_of_loading: form.port_of_loading.trim(),
        port_of_discharge: form.port_of_discharge.trim(),
        cutoff_date: form.cutoff_date,
        note: form.note.trim() || undefined,
      }
      createVessel.mutate(body, { onSuccess: onClose })
    }
  }

  const nameId = useId()
  const voyageId = useId()
  const etdId = useId()
  const etaId = useId()
  const polId = useId()
  const podId = useId()
  const cutoffId = useId()
  const noteId = useId()

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa tàu' : 'Tạo tàu mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Cập nhật thông tin tàu ${vessel?.name}.` : 'Điền đầy đủ thông tin để tạo lịch tàu.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={nameId}>Tên tàu <span className="text-destructive">*</span></Label>
            <Input id={nameId} value={form.name} onChange={set('name')} placeholder="VD: Maersk Sentosa" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={voyageId}>Số chuyến <span className="text-destructive">*</span></Label>
            <Input id={voyageId} value={form.voyage_number} onChange={set('voyage_number')} placeholder="VD: 0126E" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={cutoffId}>Cutoff <span className="text-destructive">*</span></Label>
            <Input id={cutoffId} type="date" value={form.cutoff_date} onChange={set('cutoff_date')} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={etdId}>ETD <span className="text-destructive">*</span></Label>
            <Input id={etdId} type="date" value={form.etd} onChange={set('etd')} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={etaId}>ETA <span className="text-destructive">*</span></Label>
            <Input id={etaId} type="date" value={form.eta} onChange={set('eta')} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={polId}>Cảng xuất (POL) <span className="text-destructive">*</span></Label>
            <Input id={polId} value={form.port_of_loading} onChange={set('port_of_loading')} placeholder="VD: Ho Chi Minh" disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor={podId}>Cảng đến (POD) <span className="text-destructive">*</span></Label>
            <Input id={podId} value={form.port_of_discharge} onChange={set('port_of_discharge')} placeholder="VD: Los Angeles" disabled={isPending} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={noteId}>Ghi chú</Label>
            <Textarea id={noteId} value={form.note} onChange={set('note')} placeholder="Thông tin thêm về chuyến tàu…" rows={2} disabled={isPending} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Huỷ</Button>
          <Button type="button" onClick={submit} disabled={!isValid || isPending}>
            {isPending ? (isEdit ? 'Đang lưu…' : 'Đang tạo…') : (isEdit ? 'Lưu thay đổi' : 'Tạo tàu')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({ vessel, onClose }: { vessel: Vessel | null; onClose: () => void }) {
  const deleteVessel = useDeleteVessel()
  const confirm = () => {
    if (!vessel || deleteVessel.isPending) return
    deleteVessel.mutate(vessel.id, { onSuccess: onClose })
  }
  return (
    <Dialog open={vessel !== null} onOpenChange={(o) => { if (!o && !deleteVessel.isPending) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Xoá tàu</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn xoá tàu <strong>{vessel?.name}</strong> ({vessel?.voyage_number})? Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleteVessel.isPending}>Huỷ</Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={deleteVessel.isPending}>
            {deleteVessel.isPending ? 'Đang xoá…' : 'Xoá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Expandable containers row ────────────────────────────────────────────────

function VesselContainersRow({ vesselId }: { vesselId: string }) {
  const { data: containers, isLoading } = useVesselContainers(vesselId)
  const items: Container[] = containers ?? []

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 px-8 py-3">
          <Skeleton className="h-16 w-full rounded" />
        </TableCell>
      </TableRow>
    )
  }

  if (items.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 px-8 py-3 text-center text-sm text-muted-foreground">
          Chưa có container nào gắn với tàu này.
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/30 p-0">
        <div className="px-8 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Containers ({items.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-md border bg-white px-3 py-1.5 text-sm">
                <span className="font-mono font-semibold">{c.code}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {STATUS_LABEL[c.status] ?? c.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

function VesselsTable() {
  const role = useCurrentRole()
  const { getParam, setParam } = usePageParams()

  const [searchInput, setSearchInput] = useState(getParam('search') ?? '')
  const debouncedSearch = useDebounce(searchInput, 400)
  const [prevDebounced, setPrevDebounced] = useState(debouncedSearch)
  if (prevDebounced !== debouncedSearch) {
    setPrevDebounced(debouncedSearch)
    setParam('search', debouncedSearch || undefined)
  }

  const cutoffFrom = getParam('cutoff_from') ?? ''
  const cutoffTo = getParam('cutoff_to') ?? ''
  const etdFrom = getParam('etd_from') ?? ''
  const etdTo = getParam('etd_to') ?? ''

  const hasFilters = !!debouncedSearch || !!cutoffFrom || !!cutoffTo || !!etdFrom || !!etdTo

  const { data, isLoading, isError } = useVessels({
    limit: 100,
    search: debouncedSearch || undefined,
    cutoff_from: cutoffFrom || undefined,
    cutoff_to: cutoffTo || undefined,
    etd_from: etdFrom || undefined,
    etd_to: etdTo || undefined,
  })
  const vessels = useMemo(() => data?.items ?? [], [data?.items])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editTarget, setEditTarget] = useState<Vessel | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vessel | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const canCreate = can(role, 'create', 'vessels')
  const canDelete = can(role, 'cancel', 'vessels')

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearAllFilters = () => {
    setSearchInput('')
    setParam('search', undefined)
    setParam('cutoff_from', undefined)
    setParam('cutoff_to', undefined)
    setParam('etd_from', undefined)
    setParam('etd_to', undefined)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative min-w-52 max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm tên tàu hoặc số chuyến…"
            className="pl-8"
          />
        </div>

        <DateRangeFilter
          label="Cutoff"
          from={cutoffFrom}
          to={cutoffTo}
          onChange={({ from, to }) => {
            setParam('cutoff_from', from || undefined)
            setParam('cutoff_to', to || undefined)
          }}
          onClear={() => {
            setParam('cutoff_from', undefined)
            setParam('cutoff_to', undefined)
          }}
        />

        <DateRangeFilter
          label="ETD"
          from={etdFrom}
          to={etdTo}
          onChange={({ from, to }) => {
            setParam('etd_from', from || undefined)
            setParam('etd_to', to || undefined)
          }}
          onClear={() => {
            setParam('etd_from', undefined)
            setParam('etd_to', undefined)
          }}
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearAllFilters}>
            Xoá bộ lọc
          </Button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {isLoading ? 'Đang tải…' : `${vessels.length} tàu`}
          </span>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Tạo tàu
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải danh sách tàu.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Tên tàu</TableHead>
                <TableHead>Số chuyến</TableHead>
                <TableHead>Cutoff</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>POL → POD</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : vessels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Chưa có tàu nào. Tạo tàu đầu tiên để bắt đầu lập lịch xuất hàng.
                  </TableCell>
                </TableRow>
              ) : (
                vessels.map((v) => (
                  <Fragment key={v.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(v.id)}
                    >
                      <TableCell>
                        {expanded.has(v.id)
                          ? <ChevronDown className="size-4 text-muted-foreground" />
                          : <ChevronRight className="size-4 text-muted-foreground" />
                        }
                      </TableCell>
                      <TableCell className="font-semibold">{v.name}</TableCell>
                      <TableCell className="font-mono text-sm">{v.voyage_number}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.cutoff_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.etd)}</TableCell>
                      <TableCell className="text-sm">{formatDate(v.eta)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.port_of_loading} → {v.port_of_discharge}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {canCreate && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => setEditTarget(v)}
                              aria-label={`Chỉnh sửa ${v.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(v)}
                              aria-label={`Xoá ${v.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded.has(v.id) && <VesselContainersRow vesselId={v.id} />}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <VesselDialog open={createOpen} vessel={null} onClose={() => setCreateOpen(false)} />
      <VesselDialog open={editTarget !== null} vessel={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteDialog vessel={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VesselsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Anchor className="size-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Lịch tàu</h1>
      </div>
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-lg" />}>
        <VesselsTable />
      </Suspense>
    </div>
  )
}
