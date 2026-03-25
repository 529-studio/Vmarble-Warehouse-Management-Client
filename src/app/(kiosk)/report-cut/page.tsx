import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BigButton } from '@/components/kiosk/big-button'

export const metadata: Metadata = { title: 'Báo cáo kết quả cắt' }

export default function ReportCutPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Báo cáo kết quả cắt</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kích thước đã dùng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="used-length">Dài (mm)</Label>
              <Input id="used-length" type="number" inputMode="numeric" placeholder="1200" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="used-width">Rộng (mm)</Label>
              <Input id="used-width" type="number" inputMode="numeric" placeholder="600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tấm lẻ còn lại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="remnant-length">Dài (mm)</Label>
              <Input id="remnant-length" type="number" inputMode="numeric" placeholder="400" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="remnant-width">Rộng (mm)</Label>
              <Input id="remnant-width" type="number" inputMode="numeric" placeholder="600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <BigButton>Báo cáo kết quả</BigButton>
    </div>
  )
}
