'use client'

import { use, useMemo, useSyncExternalStore, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'react-qr-code'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, QrCode, Eye, Copy, Check, CheckCircle2, Circle, ExternalLink, Loader2, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  useAddLaborEntry,
  useAddWorkOrderConsumption,
  useAdvanceStatus,
  useWorkOrder,
  useWorkOrderConsumptions,
  useWorkOrderLaborEntries,
} from '@/lib/hooks/use-work-orders'
import { usePlan } from '@/lib/hooks/use-plans'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useUsers } from '@/lib/hooks/use-users'
import { useGenerateBarcode, useBarcodesForWorkOrder, useBarcodeScanEvents, useOpenBarcodeLabelPdf } from '@/lib/hooks/use-barcode'
import { useWorkOrderCosting, useComputeCosting } from '@/lib/hooks/use-costing'
import { ApiClientError } from '@/lib/api/client'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { evaluateStartCutGate, startCutTooltip } from '@/lib/auth/work-order-gate'
import { useMe } from '@/lib/hooks/use-auth'
import { formatMoney, formatVND } from '@/lib/format'
import type {
  WorkOrderStatus,
  BarcodeRecord,
  ScanEvent,
  WorkOrder,
  ScanCheckpoint,
  MaterialType,
  AdvanceStatusInput,
  LaborStage,
  User,
} from '@/types/api'

// ── Helpers

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}


const LABOR_STAGE_LABEL: Record<LaborStage, string> = {
  CNC: 'CNC',
  GRINDING: 'Mài',
  ASSEMBLY: 'Dán',
  POLISHING: 'Đánh bóng',
}

const LABOR_STAGES: LaborStage[] = ['CNC', 'GRINDING', 'ASSEMBLY', 'POLISHING']

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  PLANNED: 'Kế hoạch',
  IN_CUTTING: 'Đang cắt',
  IN_PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  PARTIAL_COMPLETE: 'Hoàn thành một phần',
  COSTED: 'Đã tính giá',
  CANCELED: 'Đã huỷ',
}

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_CUTTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROCESSING: 'bg-orange-100 text-orange-800 border-orange-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  PARTIAL_COMPLETE: 'bg-amber-100 text-amber-800 border-amber-200',
  COSTED: 'bg-purple-100 text-purple-800 border-purple-200',
  CANCELED: 'bg-gray-100 text-gray-700 border-gray-200',
}

const SHORTFALL_REASON_LABEL: Record<string, string> = {
  MATERIAL_SHORTAGE: 'Thiếu nguyên vật liệu',
  DEFECT: 'Lỗi sản phẩm',
  TIME_SHORTAGE: 'Thiếu thời gian',
  OTHER: 'Khác',
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Scan history ─────────────────────────────────────────────────────────────

const CHECKPOINT_ORDER: ScanCheckpoint[] = ['CNC_COMPLETE', 'FINISHED_GOODS', 'SHIPPED']

const CHECKPOINT_LABEL: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'Hoàn thành CNC',
  FINISHED_GOODS: 'Hoàn thành gia công',
  SHIPPED: 'Xuất kho',
}

function BarcodeRow({ barcode }: { barcode: BarcodeRecord }) {
  const { data: events, isLoading } = useBarcodeScanEvents(barcode.id)

  const doneSet = new Set((events ?? []).map((e: ScanEvent) => e.checkpoint))
  const doneCount = CHECKPOINT_ORDER.filter((cp) => doneSet.has(cp)).length

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {barcode.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {barcode.sku_code} · {barcode.dimensions}
          </span>
        </div>
        <Link
          href={`/barcodes/${barcode.id}/scans`}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Xem timeline
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Mini checkpoint progress */}
      <div className="px-4 py-3">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex items-center">
            {CHECKPOINT_ORDER.map((cp, idx) => {
              const done = doneSet.has(cp)
              const isLast = idx === CHECKPOINT_ORDER.length - 1
              return (
                <div key={cp} className="flex flex-1 items-center">
                  {/* Step */}
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground/30" />
                    )}
                    <span className={`text-center text-xs leading-tight ${done ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {CHECKPOINT_LABEL[cp]}
                    </span>
                  </div>
                  {/* Connector line — spans to next step */}
                  {!isLast && (
                    <div
                      className={`mx-1 h-px flex-1 ${
                        doneSet.has(CHECKPOINT_ORDER[idx + 1])
                          ? 'bg-green-400'
                          : done
                            ? 'bg-green-200'
                            : 'bg-muted-foreground/20'
                      }`}
                    />
                  )}
                </div>
              )
            })}
            <span className="ml-3 shrink-0 text-xs text-muted-foreground">
              {doneCount}/{CHECKPOINT_ORDER.length}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function ScanHistorySection({ workOrderId }: { workOrderId: string }) {
  const { data: barcodes, isLoading } = useBarcodesForWorkOrder(workOrderId)

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Lịch sử quét barcode</h2>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !barcodes || barcodes.length === 0 ? (
        <p className="rounded-lg border px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có barcode nào được tạo cho lệnh sản xuất này.
        </p>
      ) : (
        <div className="space-y-4">
          {barcodes.map((bc) => (
            <BarcodeRow key={bc.id} barcode={bc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Generate Barcode Dialog ───────────────────────────────────────────────────

function ViewBarcodeDialog({ barcode, open, onClose }: {
  barcode: BarcodeRecord
  open: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const { mutate: openPdf, isPending: openingPdf } = useOpenBarcodeLabelPdf()

  function handleCopy() {
    navigator.clipboard.writeText(barcode.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    openPdf(barcode.id, {
      onSuccess: (url) => {
        const win = window.open(url, '_blank')
        if (!win) toast.error('Không mở được cửa sổ in. Vui lòng cho phép pop-up.')
      },
      onError: () => toast.error('Không tải được nhãn PDF'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Barcode của lệnh sản xuất</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
            <div className="rounded bg-white p-2">
              <QRCode value={barcode.id} size={200} />
            </div>
            <p className="text-xs text-muted-foreground">Mã barcode</p>
            <p className="break-all font-mono text-sm font-semibold">{barcode.id}</p>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <><Check className="size-4" /> Đã sao chép</>
                ) : (
                  <><Copy className="size-4" /> Sao chép mã</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={openingPdf}>
                {openingPdf ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Printer className="size-4" />
                )}
                In nhãn
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Barcode đã được tạo cho lệnh này. Tránh tạo thêm để không sinh lịch sử quét trùng.
          </p>
          <Button className="w-full" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GenerateBarcodeDialog({ wo, open, onClose }: {
  wo: WorkOrder
  open: boolean
  onClose: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const defaultDimensions = wo.sku_dimensions
    ? `${wo.sku_dimensions.length_mm}x${wo.sku_dimensions.width_mm}mm`
    : ''

  const [dimensions, setDimensions] = useState(defaultDimensions)
  const [producedDate, setProducedDate] = useState(today)
  const [result, setResult] = useState<BarcodeRecord | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: plan, isLoading: planLoading } = usePlan(wo.plan_id)
  const { mutate: generate, isPending } = useGenerateBarcode({
    onSuccess: (bc) => setResult(bc),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!plan) return
    generate({
      work_order_id: wo.id,
      sku_id: wo.sku_id,
      po_id: plan.po_id,
      production_plan_id: wo.plan_id,
      sku_code: wo.sku_code ?? '',
      sku_name: wo.sku_name ?? '',
      dimensions,
      produced_date: new Date(producedDate).toISOString(),
    })
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setResult(null)
    setCopied(false)
    setDimensions(defaultDimensions)
    setProducedDate(today)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo barcode cho lệnh sản xuất</DialogTitle>
        </DialogHeader>

        {result ? (
          /* ── Success state ── */
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="rounded bg-white p-2">
                <QRCode value={result.id} size={200} />
              </div>
              <p className="text-xs text-muted-foreground">Mã barcode</p>
              <p className="break-all font-mono text-sm font-semibold">{result.id}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopy}
              >
                {copied ? (
                  <><Check className="size-4" /> Đã sao chép</>
                ) : (
                  <><Copy className="size-4" /> Sao chép mã</>
                )}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              In ảnh QR ở trên và dán vào sản phẩm để công nhân quét.
            </p>
            <Button className="w-full" onClick={handleClose}>
              Đóng
            </Button>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
              <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{wo.sku_code}</span></p>
              <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{wo.sku_name ?? '—'}</span></p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dimensions">Kích thước</Label>
              <Input
                id="dimensions"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="vd: 600x300x18mm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="produced-date">Ngày sản xuất</Label>
              <Input
                id="produced-date"
                type="date"
                value={producedDate}
                onChange={(e) => setProducedDate(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Huỷ
              </Button>
              <Button type="submit" disabled={isPending || planLoading}>
                {isPending ? 'Đang tạo...' : 'Tạo barcode'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Labor section ─────────────────────────────────────────────────────────────

function LaborSection({ wo }: { wo: WorkOrder }) {
  const role = useCurrentRole()
  const canRecordLabor = can(role, 'record_labor', 'work_orders')
  const locked = wo.status === 'COSTED'

  const [stage, setStage] = useState<LaborStage | ''>('')
  const [minutes, setMinutes] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [ratePerHour, setRatePerHour] = useState('')

  const {
    data: entries,
    isLoading: entriesLoading,
    isError: entriesError,
  } = useWorkOrderLaborEntries(wo.id)
  // Workers eligible to have their time recorded: kiosk operators and the
  // production roles that can also perform labor themselves.
  const { data: usersData, isLoading: usersLoading } = useUsers({
    role: 'cnc,foreman,cnc_manager',
    is_active: true,
    limit: 200,
  })
  const workers = useMemo<User[]>(() => usersData?.items ?? [], [usersData?.items])
  const workersById = useMemo(() => new Map(workers.map((u) => [u.id, u])), [workers])

  const { mutate: addEntry, isPending: adding } = useAddLaborEntry()

  function workerLabel(id: string): string {
    const u = workersById.get(id)
    if (!u) return shortId(id)
    return u.full_name?.trim() || u.username
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canRecordLabor || locked || adding) return
    if (!stage) return

    const parsedMinutes = Number(minutes)
    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) return

    const parsedRate = Number(ratePerHour)
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) return

    addEntry(
      {
        workOrderId: wo.id,
        input: {
          stage,
          minutes: parsedMinutes,
          rate_per_hour: parsedRate,
          worker_id: workerId || undefined,
        },
      },
      {
        onSuccess: () => {
          setStage('')
          setMinutes('')
          setWorkerId('')
          setRatePerHour('')
        },
      },
    )
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold">Ghi nhận công lao động</h2>

      <div className="mb-3 rounded-lg border p-4">
        {!canRecordLabor ? (
          <p className="text-sm text-muted-foreground">Bạn chỉ có quyền xem công lao động.</p>
        ) : locked ? (
          <p className="text-sm text-muted-foreground">
            Giá thành đã được chốt — không thể bổ sung công lao động (BR-C04).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="labor-stage">Công đoạn *</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as LaborStage)} disabled={adding}>
                  <SelectTrigger id="labor-stage" className="h-12">
                    <SelectValue placeholder="Chọn công đoạn" />
                  </SelectTrigger>
                  <SelectContent>
                    {LABOR_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LABOR_STAGE_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="labor-minutes">Số phút *</Label>
                <Input
                  id="labor-minutes"
                  type="number"
                  min={5}
                  step={5}
                  inputMode="numeric"
                  className="h-12"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  disabled={adding}
                  placeholder="vd: 60"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="labor-rate">Đơn giá / giờ (VND) *</Label>
                <Input
                  id="labor-rate"
                  type="number"
                  min={1}
                  step="any"
                  inputMode="numeric"
                  className="h-12"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  disabled={adding}
                  placeholder="vd: 50000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="labor-worker">Công nhân</Label>
                <Select value={workerId} onValueChange={setWorkerId} disabled={usersLoading || adding}>
                  <SelectTrigger id="labor-worker" className="h-12">
                    <SelectValue placeholder={usersLoading ? 'Đang tải…' : 'Chính tôi'} />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name?.trim() || u.username}
                        <span className="ml-1 text-xs text-muted-foreground">({u.role})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12"
              disabled={
                adding ||
                !stage ||
                !minutes.trim() ||
                Number(minutes) <= 0 ||
                !ratePerHour.trim() ||
                Number(ratePerHour) <= 0
              }
            >
              {adding ? 'Đang lưu…' : 'Ghi nhận công'}
            </Button>
          </form>
        )}
      </div>

      <div className="rounded-lg border">
        {entriesLoading ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1" />
                ))}
              </div>
            ))}
          </div>
        ) : entriesError ? (
          <p className="p-4 text-sm text-destructive">Không thể tải dữ liệu công lao động.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Công đoạn</TableHead>
                  <TableHead className="text-right">Số phút</TableHead>
                  <TableHead className="text-right">Đơn giá / giờ</TableHead>
                  <TableHead className="text-right">Chi phí</TableHead>
                  <TableHead>Công nhân / Ghi nhận bởi</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!entries || entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Chưa có ghi nhận công nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const costVnd = Math.round((entry.minutes * entry.rate_per_hour) / 60)
                    const sameActor = entry.worker_id === entry.actor_id
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {LABOR_STAGE_LABEL[entry.stage] ?? entry.stage}
                        </TableCell>
                        <TableCell className="text-right">{entry.minutes}</TableCell>
                        <TableCell className="text-right">
                          {formatVND(entry.rate_per_hour)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatVND(costVnd)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{workerLabel(entry.worker_id)}</span>
                          {!sameActor && (
                            <span className="text-muted-foreground">
                              {' '}· ghi nhận bởi {workerLabel(entry.actor_id)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail content ────────────────────────────────────────────────────────────

function WorkOrderDetail({ id }: { id: string }) {
  const role = useCurrentRole()
  const { data: me } = useMe()
  const canGenerateBarcode = can(role, 'generate', 'work_orders')
  const canConsume = can(role, 'consume', 'work_orders')

  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false)
  const [showViewBarcodeDialog, setShowViewBarcodeDialog] = useState(false)
  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [unitTouched, setUnitTouched] = useState(false)

  const { data: wo, isLoading: woLoading, isError: woError } = useWorkOrder(id)
  const { data: existingBarcodes } = useBarcodesForWorkOrder(id)
  const firstBarcode = existingBarcodes?.[0] ?? null
  const hasBarcode = !!firstBarcode
  const {
    data: consumptions,
    isLoading: consumptionsLoading,
    isError: consumptionsError,
  } = useWorkOrderConsumptions(id)
  const { data: materialsData, isLoading: materialsLoading } = useMaterials({ limit: 200 })
  const { mutate: addConsumption, isPending: addingConsumption } = useAddWorkOrderConsumption()
  const { mutate: advance, isPending: advancing } = useAdvanceStatus()

  // Costing gate — only relevant when PLANNED
  const { data: costingRecord, isLoading: costingLoading, error: costingError } = useWorkOrderCosting(
    wo?.status === 'PLANNED' ? id : null,
  )
  const hasCostingRecord = !!costingRecord && !(costingError instanceof ApiClientError && costingError.status === 404)
  const { mutate: computeCosting, isPending: computingCosting } = useComputeCosting()

  const materials = useMemo(() => materialsData?.items ?? [], [materialsData?.items])
  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === materialId),
    [materials, materialId],
  )
  const canAddConsumption = canConsume && (wo?.status === 'IN_PROCESSING' || wo?.status === 'COMPLETED')
  const effectiveUnit = unitTouched ? unit : selectedMaterial?.unit ?? unit

  function handleAddConsumption(e: React.FormEvent) {
    e.preventDefault()
    if (!wo || !selectedMaterial || !canAddConsumption || addingConsumption) return

    const parsedQuantity = Number(quantity)
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return

    const trimmedUnit = effectiveUnit.trim()
    if (!trimmedUnit) return

    addConsumption(
      {
        workOrderId: wo.id,
        input: {
          material_id: selectedMaterial.id,
          material_type: selectedMaterial.type as MaterialType,
          quantity: parsedQuantity,
          unit: trimmedUnit,
        },
      },
      {
        onSuccess: () => {
          setMaterialId('')
          setQuantity('')
          setUnit('')
          setUnitTouched(false)
        },
      },
    )
  }

  if (woLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (woError || !wo) {
    return (
      <p className="text-sm text-destructive">
        Không thể tải thông tin lệnh sản xuất.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {canGenerateBarcode && (
        <GenerateBarcodeDialog
          wo={wo}
          open={showBarcodeDialog}
          onClose={() => setShowBarcodeDialog(false)}
        />
      )}
      {firstBarcode && (
        <ViewBarcodeDialog
          barcode={firstBarcode}
          open={showViewBarcodeDialog}
          onClose={() => setShowViewBarcodeDialog(false)}
        />
      )}

      {/* Carry-over banner — this WO was spawned from a parent shortfall (#241). */}
      {wo.parent_wo_id && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Đây là lệnh phát sinh từ{' '}
            <Link
              href={`/work-orders/${wo.parent_wo_id}`}
              className="font-mono font-medium underline"
            >
              #{shortId(wo.parent_wo_id)}
            </Link>
            {' '}— {wo.quantity} sản phẩm còn thiếu cần sản xuất tiếp.
          </p>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mã lệnh
            </p>
            <p className="font-mono text-lg font-bold">{shortId(wo.id)}</p>
          </div>
          <div className="flex items-center gap-2">
            {wo.status === 'IN_PROCESSING' && can(role, 'advance', 'work_orders') && (
              <Button size="sm" asChild>
                <Link href={`/work-orders/${wo.id}/report`}>
                  <ClipboardCheck className="size-4" />
                  Báo cáo hoàn thành
                </Link>
              </Button>
            )}
            {canGenerateBarcode && (
              hasBarcode ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowViewBarcodeDialog(true)}
                >
                  <Eye className="size-4" />
                  Xem barcode
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBarcodeDialog(true)}
                >
                  <QrCode className="size-4" />
                  Tạo barcode
                </Button>
              )
            )}
            <Badge variant="outline" className={STATUS_CLASS[wo.status]}>
              {STATUS_LABEL[wo.status]}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="SKU" value={wo.sku_code ?? wo.sku_id.slice(0, 8)} />
          <Field
            label="Kế hoạch"
            value={
              <Link
                href={`/plans/${wo.plan_id}`}
                className="font-mono hover:underline"
              >
                {shortId(wo.plan_id)}
              </Link>
            }
          />
          <Field label="Số lượng" value={wo.quantity.toString()} />
          {wo.status === 'PARTIAL_COMPLETE' && wo.actual_qty != null && (
            <Field
              label="Số lượng đạt"
              value={
                <span className="font-medium">
                  {wo.actual_qty} / {wo.quantity}
                  <span className="ml-1 text-muted-foreground">
                    (thiếu {wo.quantity - wo.actual_qty})
                  </span>
                </span>
              }
            />
          )}
          {wo.shortfall_reason && (
            <Field
              label="Lý do thiếu hụt"
              value={SHORTFALL_REASON_LABEL[wo.shortfall_reason] ?? wo.shortfall_reason}
            />
          )}
          {wo.sku_dimensions && (
            <Field
              label="Kích thước"
              value={`${wo.sku_dimensions.length_mm} × ${wo.sku_dimensions.width_mm} mm`}
            />
          )}
          <Field
            label="Phân công"
            value={wo.assigned_to ? shortId(wo.assigned_to) : '—'}
          />
          <Field label="Ngày tạo" value={formatDate(wo.created_at)} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="labor">Nhân công</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 pt-4">
      {/* Costing gate — only shown for PLANNED */}
      {wo.status === 'PLANNED' && (
        <div>
          <h2 className="mb-3 text-base font-semibold">Giá thành dự kiến</h2>
          <div className="rounded-lg border p-4">
            {costingLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Đang kiểm tra giá thành…
              </div>
            ) : hasCostingRecord && costingRecord ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Field label="Nguyên vật liệu" value={formatMoney(costingRecord.material_cost.amount, costingRecord.material_cost.currency)} />
                  <Field label="Vật tư phụ" value={formatMoney(costingRecord.auxiliary_cost.amount, costingRecord.auxiliary_cost.currency)} />
                  <Field label="Nhân công" value={formatMoney(costingRecord.labor_cost.amount, costingRecord.labor_cost.currency)} />
                  <Field label="Tổng chi phí" value={<span className="font-bold">{formatMoney(costingRecord.total_cost.amount, costingRecord.total_cost.currency)}</span>} />
                </div>
                {(() => {
                  const gate = evaluateStartCutGate({ wo, currentUserId: me?.id ?? null, role })

                  if (gate.kind === 'unassigned-dispatchable') {
                    return (
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/cutting-dispatch?focus=${wo.id}`}>Điều phối</Link>
                        </Button>
                        <p className="text-xs text-muted-foreground">Lệnh chưa phân công CNC</p>
                      </div>
                    )
                  }

                  if (gate.kind !== 'allowed') {
                    return (
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" disabled title={startCutTooltip(gate)}>
                          Bắt đầu cắt
                        </Button>
                        <p className="text-xs text-muted-foreground">{startCutTooltip(gate)}</p>
                      </div>
                    )
                  }

                  return (
                    <Button
                      size="sm"
                      onClick={() => {
                        const input: AdvanceStatusInput = { status: 'IN_CUTTING' }
                        advance(
                          { id: wo.id, input },
                          {
                            onError: (err) => {
                              if (err instanceof ApiClientError && err.status === 412) {
                                toast.error('Chưa đủ điều kiện để bắt đầu cắt. Kiểm tra lại giá thành hoặc phân công.')
                              }
                            },
                          },
                        )
                      }}
                      disabled={advancing}
                    >
                      {advancing ? 'Đang xử lý…' : 'Bắt đầu cắt'}
                    </Button>
                  )
                })()}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Chưa có giá thành dự kiến. Cần tính giá thành trước khi bắt đầu cắt.
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => computeCosting(wo.id)}
                    disabled={computingCosting}
                  >
                    {computingCosting ? <><Loader2 className="mr-2 size-4 animate-spin" />Đang tính…</> : 'Tính giá thành'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled
                    title="Cần tính giá thành trước khi bắt đầu cắt"
                  >
                    Bắt đầu cắt
                  </Button>
                  <p className="text-xs text-muted-foreground">← Cần tính giá thành trước</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan history */}
      <ScanHistorySection workOrderId={wo.id} />

      {/* Consumptions */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Vật tư tiêu thụ</h2>

        <div className="mb-3 rounded-lg border p-4">
          {!canConsume ? (
            <p className="text-sm text-muted-foreground">Bạn chỉ có quyền xem vật tư tiêu thụ.</p>
          ) : !canAddConsumption ? (
            <p className="text-sm text-muted-foreground">
              Chỉ ghi nhận vật tư khi lệnh ở trạng thái Đang xử lý hoặc Hoàn thành.
            </p>
          ) : (
            <form onSubmit={handleAddConsumption} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="material">Vật tư *</Label>
                  <Select value={materialId} onValueChange={setMaterialId} disabled={materialsLoading || addingConsumption}>
                    <SelectTrigger id="material" className="h-12">
                      <SelectValue placeholder={materialsLoading ? 'Đang tải vật tư…' : 'Chọn vật tư'} />
                    </SelectTrigger>
                    <SelectContent>
                      {materials.length === 0 && (
                        <SelectItem value="__none__" disabled>
                          Chưa có vật tư trong danh mục
                        </SelectItem>
                      )}
                      {materials.map((material) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Số lượng *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0.000001}
                    step="any"
                    inputMode="decimal"
                    className="h-12"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={addingConsumption}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit">Đơn vị *</Label>
                  <Input
                    id="unit"
                    className="h-12"
                    value={effectiveUnit}
                    onChange={(e) => {
                      setUnitTouched(true)
                      setUnit(e.target.value)
                    }}
                    disabled={addingConsumption}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="h-12"
                disabled={
                  addingConsumption ||
                  materialsLoading ||
                  !materialId ||
                  !effectiveUnit.trim() ||
                  !quantity.trim() ||
                  Number(quantity) <= 0
                }
              >
                {addingConsumption ? 'Đang lưu…' : 'Ghi nhận vật tư'}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-lg border">
          {consumptionsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-5 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : consumptionsError ? (
            <p className="p-4 text-sm text-destructive">Không thể tải vật tư tiêu thụ.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại vật tư</TableHead>
                    <TableHead>Mã vật tư</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead>Đơn vị</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!consumptions || consumptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Chưa có vật tư nào được ghi nhận.
                      </TableCell>
                    </TableRow>
                  ) : (
                    consumptions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.material_type}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {c.material_id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right">{c.quantity}</TableCell>
                        <TableCell>{c.unit}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(c.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="labor" className="pt-4">
          <LaborSection wo={wo} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work-orders">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <ClipboardCheck className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Chi tiết lệnh sản xuất</h1>
      </div>
      <WorkOrderDetail id={id} />
    </div>
  )
}
