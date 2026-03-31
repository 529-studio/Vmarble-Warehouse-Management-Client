'use client'

import { BigButton } from '@/components/kiosk/big-button'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function RemnantStoreClient() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Nhập kho tấm lẻ</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bước 1 - Quét QR tấm lẻ</CardTitle>
        </CardHeader>
        <CardContent>
          <ScannerView
            onScan={(code) => {
              // handled client-side in the component
              console.log('scanned', code)
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bước 2 - Quét QR vị trí kệ</CardTitle>
        </CardHeader>
        <CardContent>
          <ScannerView
            onScan={(code) => {
              console.log('location', code)
            }}
          />
        </CardContent>
      </Card>

      <BigButton disabled>Xác nhận nhập kho</BigButton>
    </div>
  )
}
