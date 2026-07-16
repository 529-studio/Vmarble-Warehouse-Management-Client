'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Container as ContainerIcon, RefreshCw, ScanLine, XCircle } from 'lucide-react'
import { useReportDefect, useScanFG } from '@/lib/hooks/use-packing'
import { ApiClientError } from '@/lib/api/client'
import { BigButton } from '@/components/kiosk/big-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PhotoUpload } from '@/components/ui/photo-upload'
import type { DefectReason, PackingScanResult } from '@/types/api'

const RESET_AFTER_MS = 3000

const REASON_LABEL: Record<DefectReason, string> = {
  CRACK: 'Nứt / vỡ',
  SCRATCH: 'Trầy xước',
  COLOR_OFF: 'Sai màu',
  WRONG_SIZE: 'Sai kích thước',
  OTHER: 'Khác',
}

interface DailyCounters {
  /** YYYY-MM-DD anchor — counters auto-reset across midnight. */
  date: string
  scanned: number
  defects: number
}

const COUNTER_KEY = 'packing_kiosk_counters_v1'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadCounters(): DailyCounters {
  if (typeof window === 'undefined') return { date: todayKey(), scanned: 0, defects: 0 }
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    if (!raw) return { date: todayKey(), scanned: 0, defects: 0 }
    const parsed = JSON.parse(raw) as DailyCounters
    // Auto-rollover on day change so the kiosk does not show "yesterday's 132".
    if (parsed.date !== todayKey()) return { date: todayKey(), scanned: 0, defects: 0 }
    return parsed
  } catch {
    return { date: todayKey(), scanned: 0, defects: 0 }
  }
}

function persistCounters(c: DailyCounters) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(COUNTER_KEY, JSON.stringify(c))
  } catch {
    /* quota exceeded — drop silently, counters are nice-to-have */
  }
}

// ── Defect dialog ─────────────────────────────────────────────────────────────

function DefectDialog({
  barcodeId,
  open,
  onCompleted,
  onCancel,
}: {
  barcodeId: string | null
  open: boolean
  onCompleted: () => void
  onCancel: () => void
}) {
  const reportDefect = useReportDefect()
  const [reason, setReason] = useState<DefectReason>('CRACK')
  const [detail, setDetail] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const detailId = useId()

  // Reset whenever a fresh dialog opens.
  const dialogKey = open ? barcodeId ?? '' : ''
  const [prevKey, setPrevKey] = useState(dialogKey)
  if (prevKey !== dialogKey) {
    setPrevKey(dialogKey)
    setReason('CRACK')
    setDetail('')
    setPhotoUrls([])
  }

  if (!barcodeId) return null

  const submit = () => {
    if (reportDefect.isPending) return
    reportDefect.mutate(
      {
        barcode_id: barcodeId,
        reason,
        detail: detail.trim() || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      },
      {
        onSuccess: () => onCompleted(),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !reportDefect.isPending) onCancel() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <AlertTriangle className="size-6 text-destructive" />
            Đánh dấu hàng lỗi
          </DialogTitle>
          <DialogDescription className="text-base">
            Mã vạch: <span className="font-mono font-semibold">{barcodeId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Lý do</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as DefectReason)} disabled={reportDefect.isPending}>
              <SelectTrigger className="h-14 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABEL) as DefectReason[]).map((r) => (
                  <SelectItem key={r} value={r} className="text-lg">
                    {REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={detailId} className="text-base">Mô tả thêm (tuỳ chọn)</Label>
            <Textarea
              id={detailId}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="VD: Vết nứt dài 5cm ở góc phải dưới."
              rows={3}
              className="text-base"
              disabled={reportDefect.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Ảnh đính kèm (tuỳ chọn)</Label>
            <PhotoUpload
              photos={photoUrls}
              onChange={setPhotoUrls}
              disabled={reportDefect.isPending}
            />
          </div>

          {reportDefect.isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {reportDefect.error instanceof ApiClientError && reportDefect.error.status === 409
                ? 'Mã hàng đã được đánh dấu lỗi trước đó.'
                : 'Không thể ghi nhận lỗi. Vui lòng thử lại.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={reportDefect.isPending}
            className="h-14 text-lg"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={reportDefect.isPending}
            className="h-14 text-lg"
          >
            {reportDefect.isPending ? 'Đang ghi nhận…' : 'Xác nhận lỗi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main scan page ────────────────────────────────────────────────────────────

export default function PackingScanPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [lastResult, setLastResult] = useState<PackingScanResult | null>(null)
  const [lastError, setLastError] = useState<{ status: number | null; message: string; barcode: string } | null>(null)
  const [defectOpen, setDefectOpen] = useState(false)

  const [counters, setCounters] = useState<DailyCounters>(() => loadCounters())
  useEffect(() => {
    persistCounters(counters)
  }, [counters])

  const scan = useScanFG()

  // Refocus the input after every state change so a barcode gun never misses.
  useEffect(() => {
    inputRef.current?.focus()
  }, [lastResult, lastError, defectOpen])

  // Auto-reset success card.
  useEffect(() => {
    if (!lastResult) return
    const t = setTimeout(() => {
      setLastResult(null)
      inputRef.current?.focus()
    }, RESET_AFTER_MS)
    return () => clearTimeout(t)
  }, [lastResult])

  const submit = () => {
    const trimmed = barcode.trim()
    if (!trimmed || scan.isPending) return
    setLastError(null)
    setLastResult(null)
    scan.mutate(trimmed, {
      onSuccess: (data) => {
        setLastResult(data)
        setBarcode('')
        setCounters((c) => ({ ...c, scanned: c.scanned + 1, date: todayKey() }))
      },
      onError: (err) => {
        const status = err instanceof ApiClientError ? err.status : null
        const message = err instanceof Error ? err.message : 'Quét mã thất bại'
        setLastError({ status, message, barcode: trimmed })
      },
    })
  }

  const tryAgain = () => {
    setLastError(null)
    setBarcode('')
  }

  const openDefectDialog = () => {
    if (!lastError) return
    setDefectOpen(true)
  }

  const onDefectCompleted = () => {
    if (lastError) {
      setCounters((c) => ({ ...c, defects: c.defects + 1, date: todayKey() }))
    }
    setDefectOpen(false)
    setLastError(null)
    setBarcode('')
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <ScanLine className="size-7 text-primary" />
        <h1 className="text-3xl font-bold">Quét đóng gói</h1>
      </div>

      {/* Barcode input — always rendered, autofocus restored after every change */}
      <div className="mb-4">
        <Label htmlFor="packing-barcode" className="text-lg">Mã vạch</Label>
        <Input
          id="packing-barcode"
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Quét hoặc nhập mã rồi nhấn Enter"
          autoFocus
          className="h-14 text-2xl font-mono"
          disabled={scan.isPending}
        />
      </div>

      {/* Result panel — fills the rest of the screen */}
      <div className="flex-1">
        {scan.isPending && (
          <div className="flex h-full items-center justify-center text-2xl text-muted-foreground">
            Đang xử lý…
          </div>
        )}

        {!scan.isPending && lastResult && (
          <SuccessPanel result={lastResult} />
        )}

        {!scan.isPending && lastError && (
          <ErrorPanel
            barcode={lastError.barcode}
            message={lastError.message}
            status={lastError.status}
            onMarkDefect={openDefectDialog}
            onRetry={tryAgain}
          />
        )}

        {!scan.isPending && !lastResult && !lastError && (
          <div className="flex h-full items-center justify-center text-xl text-muted-foreground">
            Sẵn sàng nhận mã vạch
          </div>
        )}
      </div>

      {/* Footer counter */}
      <footer className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-base">
        <span>
          Đã quét hôm nay: <span className="font-bold tabular-nums">{counters.scanned}</span>
        </span>
        <span className={counters.defects > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
          Lỗi: <span className="tabular-nums">{counters.defects}</span>
        </span>
      </footer>

      <DefectDialog
        barcodeId={lastError?.barcode ?? null}
        open={defectOpen}
        onCompleted={onDefectCompleted}
        onCancel={() => setDefectOpen(false)}
      />
    </div>
  )
}

// ── Success / error sub-panels ─────────────────────────────────────────────────

function SuccessPanel({ result }: { result: PackingScanResult }) {
  const fg = result.fg
  const top = (result.suggested_containers ?? [])[0]
  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="size-10 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Thành công</p>
          <p className="font-mono text-xl">{fg.barcode_id}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="font-mono text-3xl font-bold">{fg.sku_code}</p>
        <p className="text-2xl text-foreground/80">{fg.sku_name}</p>
      </div>

      {top ? (
        <div className="rounded-xl border border-emerald-300 bg-white/60 p-4">
          <p className="flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <ContainerIcon className="size-4" /> Container đề xuất
          </p>
          <p className="font-mono text-2xl font-bold">{top.code}</p>
          <p className="text-base text-muted-foreground">
            {top.container_type} · CBM {top.fill_pct_cbm.toFixed(0)}% · KL {top.fill_pct_mass.toFixed(0)}%
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-base text-amber-900">
          {result.wo_status
            ? `Chưa có container đề xuất (WO đang ở ${result.wo_status}).`
            : 'Chưa có container đề xuất phù hợp.'}
        </p>
      )}

      <p className="mt-auto text-sm text-muted-foreground">
        Tự động sẵn sàng cho mã tiếp theo trong 3 giây…
      </p>
    </div>
  )
}

function ErrorPanel({
  barcode,
  message,
  status,
  onMarkDefect,
  onRetry,
}: {
  barcode: string
  message: string
  status: number | null
  onMarkDefect: () => void
  onRetry: () => void
}) {
  // Friendly message — BE 422 tends to include the reason in `message`,
  // 404 means the barcode doesn't exist, 409 means already loaded/defected.
  const headline =
    status === 404
      ? 'Mã vạch không tồn tại'
      : status === 409
        ? 'Mã vạch không thể quét'
        : status === 422
          ? 'Hàng chưa đủ điều kiện đóng gói'
          : 'Quét thất bại'

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-6">
      <div className="flex items-start gap-3">
        <XCircle className="size-10 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-destructive">{headline}</p>
          <p className="font-mono text-xl">{barcode}</p>
        </div>
      </div>

      <p className="text-lg text-foreground/80">{message}</p>

      <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BigButton variant="danger" onClick={onMarkDefect}>
          <AlertTriangle className="size-5" />
          Đánh dấu lỗi
        </BigButton>
        <BigButton variant="secondary" onClick={onRetry}>
          <RefreshCw className="size-5" />
          Thử lại
        </BigButton>
      </div>
    </div>
  )
}
