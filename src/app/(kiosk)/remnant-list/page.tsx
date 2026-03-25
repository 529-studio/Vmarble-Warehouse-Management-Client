import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const metadata: Metadata = { title: 'Kho tấm lẻ' }

export default function RemnantListPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Kho tấm lẻ</h1>

      <Input placeholder="Tìm theo vật liệu, kích thước..." className="h-11 text-base" />

      {/* Placeholder list — replace with <RemnantList /> once API is wired */}
      {[
        { id: 'R-001', dims: '800 × 400 mm', material: 'Plywood', location: 'A1-R2-S3', age: 3 },
        { id: 'R-002', dims: '600 × 300 mm', material: 'MDF', location: 'A1-R2-S4', age: 7 },
        { id: 'R-003', dims: '1000 × 500 mm', material: 'Plywood', location: 'B2-R1-S1', age: 1 },
      ].map((r) => (
        <Card key={r.id} className="cursor-pointer hover:bg-muted/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-1">
              <p className="font-semibold">{r.id}</p>
              <p className="text-sm text-muted-foreground">{r.dims} · {r.material}</p>
              <p className="text-sm text-muted-foreground">Kệ: {r.location}</p>
            </div>
            <Badge variant="outline">{r.age} ngày</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
