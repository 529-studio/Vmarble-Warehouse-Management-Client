'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { BigButton } from '@/components/kiosk/big-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({
  barcode,
  nextCheckpointLabel,
  countdown,
}: {
  barcode: BarcodeRecord
  nextCheckpointLabel: string | null
  countdown: number
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
      <CheckCircle2 className="size-12 text-green-500" />
      <p className="text-xl font-bold text-green-700">Đã ghi nhận thành công!</p>

      <div className="w-full space-y-1 rounded-lg bg-white p-4 text-left text-sm">
        <p><span className="text-muted-foreground">SKU:</span> <span className="font-medium">{barcode.sku_code}</span></p>
        <p><span className="text-muted-foreground">Tên:</span> <span className="font-medium">{barcode.sku_name}</span></p>
        <p><span className="text-muted-foreground">Kích thước:</span> <span className="font-medium">{barcode.dimensions}</span></p>
        <p><span className="text-muted-foreground">Mã WO:</span> <span className="font-mono text-xs">{shortId(barcode.work_order_id)}</span></p>
        <p><span className="text-muted-foreground">Mã PO:</span> <span className="font-mono text-xs">{shortId(barcode.po_id)}</span></p>
      </div>

      {nextCheckpointLabel && (
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
  const [countdown, setCountdown] = useState(2)

  const history = useScanStore((s) => s.history)
  const { mutate: recordScan, isPending } = useRecordScan()

  useWakeLock()

  // Persist last checkpoint to localStorage
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
          return 2
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [successBarcode])

  const { data: barcode, isLoading: isLoadingBarcode, isError: barcodeError } = useBarcode(scannedBarcodeId)

  const canConfirm = !!checkpointInfo && !!barcode && !isLoadingBarcode && !isPending && !successBarcode

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
          setSuccessBarcode(barcode)
          setScannedBarcodeId('')
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
        />
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
