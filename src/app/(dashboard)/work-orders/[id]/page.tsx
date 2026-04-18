'use client'

import { use, useState } from 'react'
import QRCode from 'react-qr-code'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, QrCode, Copy, Check, CheckCircle2, Circle, ExternalLink } from 'lucide-react'
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
import { useWorkOrder, useWorkOrderConsumptions } from '@/lib/hooks/use-work-orders'
import { usePlan } from '@/lib/hooks/use-plans'
import { useGenerateBarcode, useBarcodesForWorkOrder, useBarcodeScanEvents } from '@/lib/hooks/use-barcode'
import type { WorkOrderStatus, BarcodeRecord, ScanEvent, WorkOrder, ScanCheckpoint } from '@/types/api'

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

// ── Detail content ────────────────────────────────────────────────────────────

function WorkOrderDetail({ id }: { id: string }) {
  const [showBarcodeDialog, setShowBarcodeDialog] = useState(false)
  const { data: wo, isLoading: woLoading, isError: woError } = useWorkOrder(id)
  const {
    data: consumptions,
    isLoading: consumptionsLoading,
    isError: consumptionsError,
  } = useWorkOrderConsumptions(id)

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
      <GenerateBarcodeDialog
        wo={wo}
        open={showBarcodeDialog}
        onClose={() => setShowBarcodeDialog(false)}
      />

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBarcodeDialog(true)}
            >
              <QrCode className="size-4" />
              Tạo barcode
            </Button>
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
          {wo.sku_dimensions && (
            <Field
              label="Kích thước"
              value={`${wo.sku_dimensions.length_mm} × ${wo.sku_dimensions.width_mm} mm`}
            />
          )}
          <Field
            label="Phân công"
            value={wo.assigned_to_name ?? '—'}
          />
          <Field label="Ngày tạo" value={formatDate(wo.created_at)} />
        </div>
      </div>

      {/* Scan history */}
      <ScanHistorySection workOrderId={wo.id} />

      {/* Consumptions */}
      <div>
        <h2 className="mb-3 text-base font-semibold">Vật tư tiêu thụ</h2>
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
          )}
        </div>
      </div>
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
