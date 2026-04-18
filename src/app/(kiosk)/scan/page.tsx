'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRecordScan, useScanStore } from '@/lib/hooks/use-scan'
import type { ScanCheckpoint } from '@/types/api'
import { cn } from '@/lib/utils'

const CHECKPOINTS: { key: ScanCheckpoint; label: string }[] = [
  { key: 'CNC_COMPLETE', label: 'Hoàn thành CNC' },
  { key: 'FINISHED_GOODS', label: 'Hoàn thành gia công' },
  { key: 'SHIPPED', label: 'Xuất kho' },
]

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ScanPage() {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<ScanCheckpoint | null>(null)
  const { mutate: recordScan, isPending } = useRecordScan()
  const history = useScanStore((s) => s.history)

  function handleScan(code: string) {
    if (!selectedCheckpoint) {
      toast.error('Vui lòng chọn điểm kiểm tra')
      return
    }
    recordScan({
      barcodeId: code,
      checkpoint: selectedCheckpoint,
      scannedBy: 'worker',
    })
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Quét điểm kiểm tra</h1>

      {/* Checkpoint selector */}
      <div>
        <p className="mb-2 text-base text-muted-foreground">Chọn điểm kiểm tra:</p>
        <div className="flex flex-wrap gap-2">
          {CHECKPOINTS.map((cp) => (
            <button
              key={cp.key}
              type="button"
              onClick={() => setSelectedCheckpoint(cp.key)}
              className={cn(
                'min-h-12 rounded-full border px-4 py-2 text-base font-medium transition-colors',
                selectedCheckpoint === cp.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              )}
            >
              {cp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Quét mã QR sản phẩm
            {selectedCheckpoint && (
              <Badge variant="secondary" className="text-sm">
                {CHECKPOINTS.find((c) => c.key === selectedCheckpoint)?.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScannerView
            onScan={handleScan}
            disabled={isPending}
          />
          {isPending && (
            <p className="mt-2 text-center text-base text-muted-foreground">Đang xử lý...</p>
          )}
        </CardContent>
      </Card>

      {/* Scan history */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lịch sử quét (phiên này)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                  <th className="px-4 py-2">Mã barcode</th>
                  <th className="px-4 py-2">Điểm kiểm tra</th>
                  <th className="px-4 py-2">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr key={entry.scanEvent.id ?? i} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-sm">{entry.barcodeShort}</td>
                    <td className="px-4 py-3">
                      {CHECKPOINTS.find((c) => c.key === entry.scanEvent.checkpoint)?.label ??
                        entry.scanEvent.checkpoint}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {formatTime(entry.scanEvent.scanned_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
