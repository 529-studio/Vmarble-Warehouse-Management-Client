import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Kho tấm lẻ' }

const SAMPLE = [
  { id: 'R-001', dims: '800 × 400', material: 'Plywood', grade: 'A', location: 'A1-R2-S3', age: 3, status: 'AVAILABLE' },
  { id: 'R-002', dims: '600 × 300', material: 'MDF', grade: 'B', location: 'A1-R2-S4', age: 7, status: 'AVAILABLE' },
  { id: 'R-003', dims: '1000 × 500', material: 'Plywood', grade: 'A', location: 'B2-R1-S1', age: 1, status: 'ALLOCATED' },
]

export default function RemnantsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kho tấm lẻ</h1>

      <div className="flex gap-3">
        <Input className="max-w-sm" placeholder="Tìm theo ID, vật liệu, kích thước..." />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Kích thước (mm)</TableHead>
              <TableHead>Vật liệu</TableHead>
              <TableHead>Chất lượng</TableHead>
              <TableHead>Vị trí kệ</TableHead>
              <TableHead>Tuổi (ngày)</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SAMPLE.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
                <TableCell className="font-mono text-sm">{r.id}</TableCell>
                <TableCell>{r.dims}</TableCell>
                <TableCell>{r.material}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.grade}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{r.location}</TableCell>
                <TableCell>{r.age}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                    {r.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
