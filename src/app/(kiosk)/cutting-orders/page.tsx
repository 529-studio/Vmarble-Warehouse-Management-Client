import type { Metadata } from 'next'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Lệnh cắt hôm nay' }

// Route-level loading skeleton lives in loading.tsx — this page uses Suspense
// boundaries for finer control.
export default function CuttingOrdersPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Lệnh cắt hôm nay</h1>

      {/* Placeholder cards — replace with <CuttingOrderList /> once API is wired */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="text-base font-semibold">WO-000{i}</p>
              <p className="text-sm text-muted-foreground">SKU-SAMPLE-{i} × 4</p>
              <p className="text-sm text-muted-foreground">1200 × 600 mm · Plywood</p>
            </div>
            <Badge variant="secondary">IN_CUTTING</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
