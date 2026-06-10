'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { BigButton } from '@/components/kiosk/big-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBarcode } from '@/lib/hooks/use-barcode'
import { useRecordScan, useScanStore, getDeviceId, getDeviceName } from '@/lib/hooks/use-scan'
import { CHECKPOINT_LABEL, getCheckpointBySlug, getNextCheckpointSlug, CHECKPOINT_ROUTES } from '@/lib/checkpoints'
import type { BarcodeRecord } from '@/types/api'

const LAST_CHECKPOINT_KEY = 'scan_last_checkpoint_slug'

function saveLastCheckpoint(slug: string) {
  try { localStorage.setItem(LAST_CHECKPOINT_KEY, slug) } catch { /* storage blocked */ }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

// ── Wake lock ─────────────────────────────────────────────────────────────────

function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let released = false

    navigator.wakeLock.request('screen').then((lock) => {
      if (!released) wakeLockRef.current = lock
      else lock.release().catch(() => {})
    }).catch(() => { /* device may not support it */ })

    const reacquire = () => {
      if (!document.hidden && !wakeLockRef.current && !released) {
        navigator.wakeLock.request('screen').then((lock) => {
          if (!released) wakeLockRef.current = lock
          else lock.release().catch(() => {})
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', reacquire)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', reacquire)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])
}

// ── QC fail note modal ────────────────────────────────────────────────────────

const QC_FAIL_REASONS = [
  { value: 'SCRATCH', label: 'Trầy xước bề mặt' },
  { value: 'WRONG_SIZE', label: 'Sai kích thước' },
  { value: 'CRACK', label: 'Nứt / vỡ' },
  { value: 'DELAMINATION', label: 'Bong tróc lớp' },
  { value: 'OTHER', label: 'Lý do khác' },
]

interface QCFailModalProps {
  open: boolean
  isPending: boolean
  onClose: () => void
  onSubmit: (note: string) => void
}

function QCFailModal({ open, isPending, onClose, onSubmit }: QCFailModalProps) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')

  function handleSubmit() {
    if (!reason) {
      toast.error('Chọn loại lỗi')
      return
    }
    const reasonLabel = QC_FAIL_REASONS.find((r) => r.value === reason)?.label ?? reason
    const note = detail.trim() ? `${reasonLabel}: ${detail.trim()}` : reasonLabel
    onSubmit(note)
  }

  function handleClose() {
    setReason('')
    setDetail('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Ghi nhận lỗi QC</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-base">Loại lỗi *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="min-h-[48px] text-base">
                <SelectValue placeholder="— Chọn loại lỗi —" />
              </SelectTrigger>
              <SelectContent>
                {QC_FAIL_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-base">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-base">Ghi chú thêm (tùy chọn)</Label>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Mô tả chi tiết lỗi…"
              className="min-h-[80px] text-base"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="min-h-[48px] flex-1 text-base"
            onClick={handleClose}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            className="min-h-[48px] flex-1 text-base"
            onClick={handleSubmit}
            disabled={isPending || !reason}
          >
            {isPending ? 'Đang ghi…' : 'Xác nhận lỗi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── QC decision panel ─────────────────────────────────────────────────────────

interface QCDecisionPanelProps {
  barcode: BarcodeRecord
  isPending: boolean
  onPass: () => void
  onFail: () => void
}

function QCDecisionPanel({ barcode, isPending, onPass, onFail }: QCDecisionPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-1 text-sm">
        <p className="text-base font-bold text-blue-800">Hoàn thành CNC — Kiểm tra chất lượng</p>
        <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{barcode.sku_code}</span></p>
        <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{barcode.sku_name}</span></p>
        <p><span className="text-muted-foreground">Kích thước:</span> <span className="font-medium">{barcode.dimensions}</span></p>
        <p><span className="text-muted-foreground">Mã WO:</span> <span className="font-mono text-xs">{shortId(barcode.work_order_id)}</span></p>
      </div>

      <p className="text-base font-medium text-muted-foreground text-center">Kết quả QC:</p>

      <BigButton
        className="bg-green-600 hover:bg-green-700 text-white"
        disabled={isPending}
        onClick={onPass}
      >
        {isPending ? 'Đang ghi…' : '✓ QC Đạt'}
      </BigButton>

      <BigButton
        className="bg-red-600 hover:bg-red-700 text-white"
        disabled={isPending}
        onClick={onFail}
      >
        {isPending ? 'Đang ghi…' : '✗ QC Lỗi'}
      </BigButton>
    </div>
  )
}

// ── Success / result screen ───────────────────────────────────────────────────

function SuccessScreen({
  barcode,
  nextCheckpointLabel,
  countdown,
  qcResult,
}: {
  barcode: BarcodeRecord
  nextCheckpointLabel: string | null
  countdown: number
  qcResult?: 'QC_PASSED' | 'QC_FAILED'
}) {
  const isPassed = qcResult !== 'QC_FAILED'
  const borderClass = isPassed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
  const iconClass = isPassed ? 'text-green-500' : 'text-red-500'
  const textClass = isPassed ? 'text-green-700' : 'text-red-700'
  const label = isPassed
    ? qcResult === 'QC_PASSED' ? 'QC Đạt — Ghi nhận thành công!' : 'Đã ghi nhận thành công!'
    : 'QC Lỗi — Đã ghi nhận!'

  return (
    <div className={`flex flex-col items-center gap-4 rounded-xl border ${borderClass} p-6 text-center`}>
      {isPassed
        ? <CheckCircle2 className={`size-12 ${iconClass}`} />
        : <XCircle className={`size-12 ${iconClass}`} />}
      <p className={`text-xl font-bold ${textClass}`}>{label}</p>

      <div className="w-full space-y-1 rounded-lg bg-white p-4 text-left text-sm">
        <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{barcode.sku_code}</span></p>
        <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{barcode.sku_name}</span></p>
        <p><span className="text-muted-foreground">Kích thước:</span> <span className="font-medium">{barcode.dimensions}</span></p>
        <p><span className="text-muted-foreground">Mã WO:</span> <span className="font-mono text-xs">{shortId(barcode.work_order_id)}</span></p>
        <p><span className="text-muted-foreground">Mã PO:</span> <span className="font-mono text-xs">{shortId(barcode.po_id)}</span></p>
      </div>

      {!qcResult && nextCheckpointLabel && (
        <p className="text-sm text-muted-foreground">
          Checkpoint tiếp theo: <span className="font-medium text-foreground">→ {nextCheckpointLabel}</span>
        </p>
      )}

      <p className="text-sm text-muted-foreground">Tiếp tục quét sau {countdown}s…</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CheckpointScanPage() {
  const params = useParams<{ checkpoint: string }>()
  const router = useRouter()
  const checkpointInfo = getCheckpointBySlug(params.checkpoint)

  const [scannedBarcodeId, setScannedBarcodeId] = useState<string>('')
  const [successBarcode, setSuccessBarcode] = useState<BarcodeRecord | null>(null)
  const [successQCResult, setSuccessQCResult] = useState<'QC_PASSED' | 'QC_FAILED' | undefined>(undefined)
  const [countdown, setCountdown] = useState(2)

  // QC flow state (CNC_COMPLETE only)
  const [qcPendingBarcode, setQcPendingBarcode] = useState<BarcodeRecord | null>(null)
  const [qcFailModalOpen, setQcFailModalOpen] = useState(false)

  const history = useScanStore((s) => s.history)
  const { mutate: recordScan, isPending } = useRecordScan()

  useWakeLock()

  useEffect(() => {
    if (params.checkpoint) saveLastCheckpoint(params.checkpoint)
  }, [params.checkpoint])

  // Auto-dismiss success screen after 2s
  useEffect(() => {
    if (!successBarcode) return
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          setSuccessBarcode(null)
          setSuccessQCResult(undefined)
          return 2
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [successBarcode])

  const { data: barcode, isLoading: isLoadingBarcode, isError: barcodeError } = useBarcode(scannedBarcodeId)

  const isCNCCheckpoint = checkpointInfo?.checkpoint === 'CNC_COMPLETE'
  const canConfirm = !!checkpointInfo && !!barcode && !isLoadingBarcode && !isPending && !successBarcode && !qcPendingBarcode

  const historyForCheckpoint = useMemo(() => {
    if (!checkpointInfo) return []
    return history.filter((entry) => entry.scanResult.checkpoint === checkpointInfo.checkpoint)
  }, [history, checkpointInfo])

  const nextSlug = getNextCheckpointSlug(params.checkpoint)
  const nextCheckpoint = nextSlug ? CHECKPOINT_ROUTES[nextSlug] : null

  if (!checkpointInfo) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-base text-destructive">Không tìm thấy công đoạn quét.</p>
        <Button asChild variant="outline" className="min-h-[48px] text-base">
          <Link href="/scan">Quay lại chọn công đoạn</Link>
        </Button>
      </div>
    )
  }

  function handleScan(rawCode: string) {
    const barcodeId = rawCode.trim()
    if (!barcodeId) {
      toast.error('Mã quét không hợp lệ. Vui lòng thử lại.')
      return
    }
    setScannedBarcodeId(barcodeId)
  }

  function handleConfirmCheckpoint() {
    if (!barcode || !checkpointInfo) return
    recordScan(
      {
        barcodeId: barcode.id,
        checkpoint: checkpointInfo.checkpoint,
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      },
      {
        onSuccess: () => {
          if (isCNCCheckpoint) {
            // Enter QC decision phase instead of immediately showing success
            setQcPendingBarcode(barcode)
            setScannedBarcodeId('')
          } else {
            setSuccessBarcode(barcode)
            setScannedBarcodeId('')
          }
        },
      },
    )
  }

  function handleQCPass() {
    if (!qcPendingBarcode) return
    recordScan(
      {
        barcodeId: qcPendingBarcode.id,
        checkpoint: 'QC_PASSED',
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      },
      {
        onSuccess: () => {
          setSuccessBarcode(qcPendingBarcode)
          setSuccessQCResult('QC_PASSED')
          setQcPendingBarcode(null)
        },
      },
    )
  }

  function handleQCFailSubmit(note: string) {
    if (!qcPendingBarcode) return
    recordScan(
      {
        barcodeId: qcPendingBarcode.id,
        checkpoint: 'QC_FAILED',
        note,
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      },
      {
        onSuccess: () => {
          setQcFailModalOpen(false)
          setSuccessBarcode(qcPendingBarcode)
          setSuccessQCResult('QC_FAILED')
          setQcPendingBarcode(null)
        },
      },
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/scan')}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border bg-white text-muted-foreground"
          aria-label="Quay lại"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Quét: {checkpointInfo.label}</h1>
          <p className="text-sm text-muted-foreground">{checkpointInfo.description}</p>
        </div>
      </div>

      {successBarcode ? (
        <SuccessScreen
          barcode={successBarcode}
          nextCheckpointLabel={nextCheckpoint?.label ?? null}
          countdown={countdown}
          qcResult={successQCResult}
        />
      ) : qcPendingBarcode ? (
        <>
          <QCDecisionPanel
            barcode={qcPendingBarcode}
            isPending={isPending}
            onPass={handleQCPass}
            onFail={() => setQcFailModalOpen(true)}
          />
          <QCFailModal
            open={qcFailModalOpen}
            isPending={isPending}
            onClose={() => setQcFailModalOpen(false)}
            onSubmit={handleQCFailSubmit}
          />
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bước 1: Quét mã barcode sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScannerView onScan={handleScan} disabled={isPending || isLoadingBarcode} />
              {isLoadingBarcode && <p className="text-base text-muted-foreground">Đang tải thông tin sản phẩm…</p>}
              {barcodeError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Không tìm thấy barcode hoặc barcode không hợp lệ.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bước 2: Xác nhận checkpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!barcode ? (
                <p className="text-base text-muted-foreground">Chưa có barcode được quét.</p>
              ) : (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-semibold">{barcode.sku_code}</p>
                    <Badge variant="secondary" className="text-sm">{CHECKPOINT_LABEL[checkpointInfo.checkpoint]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{barcode.sku_name}</p>
                  <p className="text-sm text-muted-foreground">Kích thước: {barcode.dimensions}</p>
                  <p className="font-mono text-xs text-muted-foreground">{barcode.id}</p>
                </div>
              )}

              <BigButton disabled={!canConfirm} onClick={handleConfirmCheckpoint}>
                {isPending ? 'Đang xác nhận…' : 'Xác nhận hoàn thành điểm kiểm tra'}
              </BigButton>
            </CardContent>
          </Card>
        </>
      )}

      {historyForCheckpoint.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lịch sử quét gần đây ({checkpointInfo.label})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {historyForCheckpoint.map((entry, i) => (
              <div key={`${entry.scanResult.id}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="font-mono text-sm">{entry.barcodeShort}</span>
                <span className="text-sm text-muted-foreground">{formatTime(entry.scanResult.scanned_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
