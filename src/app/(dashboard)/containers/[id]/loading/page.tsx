'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, Plus, Minus, Trash2, ArrowRightLeft, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RoleGate } from '@/components/auth/role-gate'
import { LifecycleDialog } from '@/components/containers/lifecycle-dialog'
import {
  useAddContainerLine,
  useContainer,
  useContainers,
  useRemoveContainerLine,
  useTransferContainerLine,
} from '@/lib/hooks/use-containers'
import { useSalesOrders } from '@/lib/hooks/use-sales-orders'
import { useSKUs } from '@/lib/hooks/use-skus'
import type {
  Container,
  ContainerLine,
  ContainerStatus,
  SalesOrder,
  SalesOrderLine,
} from '@/types/api'

// ── Status helpers (mirrors kanban page; kept inline to avoid premature abstraction) ──

const STATUS_LABEL: Record<ContainerStatus, string> = {
  OPEN: 'Mở',
  LOADING: 'Đang xếp',
  SEALED: 'Đã niêm phong',
  SHIPPED: 'Đã xuất',
  CANCELLED: 'Đã huỷ',
}

const STATUS_BADGE_VARIANT: Record<ContainerStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  OPEN: 'outline',
  LOADING: 'default',
  SEALED: 'secondary',
  SHIPPED: 'secondary',
  CANCELLED: 'destructive',
}

function formatPct(pct: number) {
  if (!Number.isFinite(pct)) return '0%'
  return `${pct.toFixed(0)}%`
}

function formatNumber(n: number, fractionDigits = 2) {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: fractionDigits })
}

// ── Capacity gauge ────────────────────────────────────────────────────────────

function CapacityBar({ label, used, max, unit }: { label: string; used: number; max: number; unit: string }) {
  const pct = max > 0 ? (used / max) * 100 : 0
  const over = pct > 100
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`tabular-nums font-medium ${over ? 'text-destructive' : ''}`}>
          {formatNumber(used)} / {formatNumber(max)} {unit} · {formatPct(pct)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

// ── Add-line dialog ───────────────────────────────────────────────────────────

interface AddLineCandidate {
  soLine: SalesOrderLine
  so: SalesOrder
  sku: { code: string; name: string } | undefined
  qtyRemaining: number
}

function AddLineDialog({
  containerId,
  candidate,
  onCompleted,
  onCancel,
}: {
  containerId: string
  candidate: AddLineCandidate | null
  onCompleted: () => void
  onCancel: () => void
}) {
  const addLine = useAddContainerLine()
  const [qty, setQty] = useState('1')
  const [cbm, setCbm] = useState('')
  const [weight, setWeight] = useState('')

  // Reset whenever a different candidate opens.
  const candidateKey = candidate ? candidate.soLine.id : ''
  const [prevKey, setPrevKey] = useState(candidateKey)
  if (prevKey !== candidateKey) {
    setPrevKey(candidateKey)
    setQty('1')
    setCbm('')
    setWeight('')
  }

  if (!candidate) return null

  const qtyNum = Number(qty)
  const cbmNum = Number(cbm)
  const weightNum = Number(weight)

  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum <= candidate.qtyRemaining
  const cbmValid = Number.isFinite(cbmNum) && cbmNum > 0
  const weightValid = Number.isFinite(weightNum) && weightNum > 0
  const canSubmit = qtyValid && cbmValid && weightValid && !addLine.isPending

  const submit = () => {
    if (!canSubmit) return
    addLine.mutate(
      {
        id: containerId,
        body: {
          sales_order_line_id: candidate.soLine.id,
          sku_id: candidate.soLine.sku_id,
          qty: qtyNum,
          cbm_total: cbmNum,
          weight_kg_total: weightNum,
        },
      },
      { onSuccess: () => onCompleted() },
    )
  }

  return (
    <Dialog open={candidate !== null} onOpenChange={(o) => { if (!o && !addLine.isPending) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm dòng hàng vào container</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold">{candidate.sku?.code ?? candidate.soLine.sku_id}</span>{' '}
            — {candidate.sku?.name ?? '(không tìm thấy SKU)'} · còn lại {candidate.qtyRemaining}/{candidate.soLine.qty_ordered}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="add-line-qty">Số lượng</Label>
            <Input
              id="add-line-qty"
              type="number"
              min="1"
              max={candidate.qtyRemaining}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={addLine.isPending}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-line-cbm">Tổng CBM (m³)</Label>
              <Input
                id="add-line-cbm"
                type="number"
                step="0.001"
                min="0"
                value={cbm}
                onChange={(e) => setCbm(e.target.value)}
                disabled={addLine.isPending}
                placeholder="VD: 0.45"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-line-weight">Tổng khối lượng (kg)</Label>
              <Input
                id="add-line-weight"
                type="number"
                step="0.01"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={addLine.isPending}
                placeholder="VD: 120"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            CBM và khối lượng do người xếp nhập trực tiếp — backend chưa derive từ SKU.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={addLine.isPending}>Huỷ</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {addLine.isPending ? 'Đang thêm…' : 'Thêm vào container'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Transfer dialog ───────────────────────────────────────────────────────────

function TransferLineDialog({
  sourceContainerId,
  line,
  candidates,
  onCompleted,
  onCancel,
}: {
  sourceContainerId: string
  line: ContainerLine | null
  candidates: Container[]
  onCompleted: () => void
  onCancel: () => void
}) {
  const transfer = useTransferContainerLine()
  const [target, setTarget] = useState('')
  const [qty, setQty] = useState('')
  const [cbm, setCbm] = useState('')
  const [weight, setWeight] = useState('')

  const lineKey = line?.id ?? ''
  const [prevLineKey, setPrevLineKey] = useState(lineKey)
  if (prevLineKey !== lineKey) {
    setPrevLineKey(lineKey)
    setTarget('')
    if (line) {
      setQty(String(line.qty))
      setCbm(String(line.cbm_total))
      setWeight(String(line.weight_kg_total))
    } else {
      setQty('')
      setCbm('')
      setWeight('')
    }
  }

  if (!line) return null

  const qtyNum = Number(qty)
  const cbmNum = Number(cbm)
  const weightNum = Number(weight)
  const qtyValid = Number.isFinite(qtyNum) && qtyNum > 0 && qtyNum <= line.qty
  const cbmValid = Number.isFinite(cbmNum) && cbmNum > 0
  const weightValid = Number.isFinite(weightNum) && weightNum > 0
  const canSubmit = !!target && qtyValid && cbmValid && weightValid && !transfer.isPending

  const submit = () => {
    if (!canSubmit) return
    transfer.mutate(
      {
        id: sourceContainerId,
        body: {
          line_id: line.id,
          target_container_id: target,
          qty: qtyNum,
          cbm_total: cbmNum,
          weight_kg_total: weightNum,
        },
      },
      { onSuccess: () => onCompleted() },
    )
  }

  return (
    <Dialog open={line !== null} onOpenChange={(o) => { if (!o && !transfer.isPending) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chuyển dòng hàng sang container khác</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold">{line.sku_code}</span> — {line.sku_name} · đang có {line.qty} đơn vị.
            Nhập số lượng và chỉ số CBM/khối lượng cần chuyển; phần còn lại được giữ tại container nguồn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="transfer-target">Container đích</Label>
            <Select value={target} onValueChange={setTarget} disabled={transfer.isPending}>
              <SelectTrigger id="transfer-target">
                <SelectValue placeholder="Chọn container OPEN/LOADING…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <SelectItem value="__none" disabled>Không có container hợp lệ</SelectItem>
                ) : (
                  candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {STATUS_LABEL[c.status]}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-qty">Số lượng</Label>
              <Input id="transfer-qty" type="number" min="1" max={line.qty} value={qty} onChange={(e) => setQty(e.target.value)} disabled={transfer.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfer-cbm">CBM</Label>
              <Input id="transfer-cbm" type="number" step="0.001" min="0" value={cbm} onChange={(e) => setCbm(e.target.value)} disabled={transfer.isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfer-weight">Khối lượng (kg)</Label>
              <Input id="transfer-weight" type="number" step="0.01" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} disabled={transfer.isPending} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={transfer.isPending}>Huỷ</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {transfer.isPending ? 'Đang chuyển…' : 'Chuyển'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ContainerLoadingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: containerId } = use(params)

  // Detail (with lines hydrated) + flat container list (for transfer-target picker).
  const { data: container, isLoading, isError } = useContainer(containerId)
  const { data: containersList } = useContainers({ limit: 200 })

  // Sales orders + SKUs to render the left panel.
  const [customerFilter, setCustomerFilter] = useState<string>('ALL')
  const [skuQuery, setSkuQuery] = useState('')

  const { data: soData, isLoading: soLoading } = useSalesOrders({
    limit: 100,
    status: customerFilter === 'ALL' ? undefined : undefined, // status filter unused in v1
    customer_id: customerFilter === 'ALL' ? undefined : customerFilter,
  })
  const { data: skusData } = useSKUs({ limit: 500 })
  const skuMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>()
    for (const s of skusData?.items ?? []) map.set(s.id, { code: s.code, name: s.name })
    return map
  }, [skusData?.items])

  const removeLine = useRemoveContainerLine()
  const [seal, setSeal] = useState(false)
  const [pendingAdd, setPendingAdd] = useState<AddLineCandidate | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<ContainerLine | null>(null)

  // Flatten SO lines with computed remaining + customer name attached.
  const candidates = useMemo<AddLineCandidate[]>(() => {
    const sos = soData?.items ?? []
    const out: AddLineCandidate[] = []
    for (const so of sos) {
      // Skip SOs in non-actionable statuses early — DRAFT/CANCELLED have nothing to ship.
      if (so.status === 'CANCELLED') continue
      for (const ln of so.lines ?? []) {
        const remaining = ln.qty_ordered - ln.qty_planned
        if (remaining <= 0) continue
        const sku = skuMap.get(ln.sku_id)
        if (skuQuery && sku && !`${sku.code} ${sku.name}`.toLowerCase().includes(skuQuery.toLowerCase())) continue
        out.push({ soLine: ln, so, sku, qtyRemaining: remaining })
      }
    }
    return out
  }, [soData?.items, skuMap, skuQuery])

  const customers = useMemo(() => {
    const map = new Map<string, string>()
    for (const so of soData?.items ?? []) {
      if (so.customer_id && so.customer_name) map.set(so.customer_id, so.customer_name)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'vi'))
  }, [soData?.items])

  // Transfer-target candidates: same persona-filtered OPEN/LOADING containers,
  // excluding the source.
  const transferCandidates = useMemo(() => {
    return (containersList?.items ?? []).filter(
      (c) => c.id !== containerId && (c.status === 'OPEN' || c.status === 'LOADING'),
    )
  }, [containersList?.items, containerId])

  const editable = container?.status === 'OPEN' || container?.status === 'LOADING'

  if (isLoading) {
    return <LoadingSkeleton />
  }
  if (isError || !container) {
    return (
      <div className="space-y-4">
        <Link href="/containers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Quay lại Container
        </Link>
        <p className="text-sm text-destructive">Không thể tải container.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/containers" aria-label="Quay lại Container">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <Package className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{container.code}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{container.container_type}</Badge>
              <Badge variant={STATUS_BADGE_VARIANT[container.status]}>
                {STATUS_LABEL[container.status]}
              </Badge>
            </div>
          </div>
        </div>

        <RoleGate min="PLANNER">
          <Button
            onClick={() => setSeal(true)}
            disabled={!editable || (container.lines ?? []).length === 0}
          >
            <Lock className="size-4" /> Niêm phong
          </Button>
        </RoleGate>
      </div>

      {/* Capacity gauges */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <CapacityBar label="CBM" used={container.used_cbm} max={container.max_cbm} unit="m³" />
          <CapacityBar label="Khối lượng" used={container.used_weight_kg} max={container.max_payload_kg} unit="kg" />
        </CardContent>
      </Card>

      {!editable && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Container đang ở trạng thái <strong>{STATUS_LABEL[container.status]}</strong>. Không thể thêm/xoá/chuyển dòng hàng. Mở lại (admin) để chỉnh sửa.
        </p>
      )}

      {/* Split screen */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left — available SO lines */}
        <Card>
          <CardHeader className="space-y-3 pb-3">
            <CardTitle className="text-base">Dòng SO sẵn sàng xếp</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="Khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả khách</SelectItem>
                  {customers.map(([cid, cname]) => (
                    <SelectItem key={cid} value={cid}>{cname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={skuQuery}
                onChange={(e) => setSkuQuery(e.target.value)}
                placeholder="Tìm SKU…"
                className="h-9 max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Khách</TableHead>
                  <TableHead className="text-right">Còn lại</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {soLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : candidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Không có dòng SO nào còn lại để xếp.
                    </TableCell>
                  </TableRow>
                ) : (
                  candidates.map((c) => (
                    <TableRow key={c.soLine.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{c.sku?.code ?? c.soLine.sku_id}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{c.sku?.name ?? '—'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{c.so.customer_name ?? c.so.customer_code ?? '—'}</div>
                        <div className="text-muted-foreground">{c.so.code}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.qtyRemaining}/{c.soLine.qty_ordered}
                      </TableCell>
                      <TableCell>
                        <RoleGate min="PLANNER">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPendingAdd(c)}
                            disabled={!editable}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </RoleGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right — container content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Đã xếp · {(container.lines ?? []).length} dòng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">CBM</TableHead>
                  <TableHead className="text-right">Khối lượng</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(container.lines ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      Container chưa có dòng hàng.
                    </TableCell>
                  </TableRow>
                ) : (
                  (container.lines ?? []).map((ln) => (
                    <TableRow key={ln.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{ln.sku_code}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{ln.sku_name}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{ln.qty}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(ln.cbm_total, 3)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(ln.weight_kg_total)}</TableCell>
                      <TableCell>
                        <RoleGate min="PLANNER">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingTransfer(ln)}
                              disabled={!editable || transferCandidates.length === 0}
                              title={transferCandidates.length === 0 ? 'Không có container đích' : 'Chuyển sang container khác'}
                            >
                              <ArrowRightLeft className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm(`Xoá dòng ${ln.sku_code} (${ln.qty} đơn vị)?`)) {
                                  removeLine.mutate({ id: containerId, lineId: ln.id })
                                }
                              }}
                              disabled={!editable || removeLine.isPending}
                            >
                              {removeLine.variables?.lineId === ln.id && removeLine.isPending ? (
                                <Minus className="size-3" />
                              ) : (
                                <Trash2 className="size-3 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </RoleGate>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddLineDialog
        containerId={containerId}
        candidate={pendingAdd}
        onCompleted={() => setPendingAdd(null)}
        onCancel={() => setPendingAdd(null)}
      />
      <TransferLineDialog
        sourceContainerId={containerId}
        line={pendingTransfer}
        candidates={transferCandidates}
        onCompleted={() => {
          setPendingTransfer(null)
          // The kanban + detail are invalidated by the hook; toast already fires.
          if (transferCandidates.length === 0) toast.info('Không còn container đích.')
        }}
        onCancel={() => setPendingTransfer(null)}
      />
      <LifecycleDialog
        open={seal}
        action={seal ? 'seal' : null}
        containerId={containerId}
        containerCode={container.code}
        onCompleted={() => setSeal(false)}
        onCancel={() => setSeal(false)}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}
