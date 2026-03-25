import type { Metadata } from 'next'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Quét điểm kiểm tra' }

const CHECKPOINTS = [
  { key: 'CNC_COMPLETE', label: 'Hoàn thành CNC' },
  { key: 'FINISHING_COMPLETE', label: 'Hoàn thành gia công' },
  { key: 'WAREHOUSE_SHIP', label: 'Xuất kho' },
] as const

export default function ScanPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Quét điểm kiểm tra</h1>

      <div className="flex flex-wrap gap-2">
        {CHECKPOINTS.map((cp) => (
          <Badge key={cp.key} variant="outline" className="cursor-pointer px-3 py-1.5 text-sm">
            {cp.label}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quét mã QR sản phẩm</CardTitle>
        </CardHeader>
        <CardContent>
          <ScannerView onScan={(code) => console.log('scan', code)} />
        </CardContent>
      </Card>
    </div>
  )
}
