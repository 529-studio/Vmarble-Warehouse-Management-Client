'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { BigButton } from '@/components/kiosk/big-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useBarcode } from '@/lib/hooks/use-barcode'
import { useRecordScan, useScanStore, getDeviceId, getDeviceName } from '@/lib/hooks/use-scan'
import { CHECKPOINT_LABEL, getCheckpointBySlug } from '@/lib/checkpoints'

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function normalizeBarcodeId(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      const candidate = parsed.id ?? parsed.barcode_id ?? parsed.barcodeId
      return typeof candidate === 'string' ? candidate.trim() : text
    } catch {
      return text
    }
  }
  return text
}

export default function CheckpointScanPage() {
  const params = useParams<{ checkpoint: string }>()
  const router = useRouter()
  const checkpointInfo = getCheckpointBySlug(params.checkpoint)

  const [scannedBarcodeId, setScannedBarcodeId] = useState<string>('')
  const history = useScanStore((s) => s.history)
  const { mutate: recordScan, isPending } = useRecordScan()

  const { data: barcode, isLoading: isLoadingBarcode, isError: barcodeError } = useBarcode(scannedBarcodeId)

  const canConfirm = !!checkpointInfo && !!barcode && !isLoadingBarcode && !isPending

  const historyForCheckpoint = useMemo(() => {
    if (!checkpointInfo) return []
    return history.filter((entry) => entry.scanResult.checkpoint === checkpointInfo.checkpoint)
  }, [history, checkpointInfo])

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
    const barcodeId = normalizeBarcodeId(rawCode)
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
          <h1 className="text-xl font-bold">Quét điểm kiểm tra: {checkpointInfo.label}</h1>
          <p className="text-base text-muted-foreground">Quét mã barcode, kiểm tra thông tin, rồi xác nhận hoàn thành.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bước 1: Quét mã barcode sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScannerView onScan={handleScan} disabled={isPending || isLoadingBarcode} />
          {isLoadingBarcode && <p className="text-base text-muted-foreground">Đang tải thông tin sản phẩm...</p>}
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
            {isPending ? 'Đang xác nhận...' : 'Xác nhận hoàn thành điểm kiểm tra'}
          </BigButton>
        </CardContent>
      </Card>

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
