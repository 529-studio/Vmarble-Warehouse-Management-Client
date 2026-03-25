import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata: Metadata = { title: 'Tính giá thành' }

const SAMPLE_ITEMS = [
  { sku: 'SKU-CHAIR-01', qty: 20, materialCost: 4_200_000, wasteCost: 380_000, remnantSavings: 210_000, unitCost: 219_000 },
  { sku: 'SKU-TABLE-02', qty: 10, materialCost: 8_100_000, wasteCost: 620_000, remnantSavings: 450_000, unitCost: 827_000 },
]

const fmt = (n: number) =>
  n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

export default function CostingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tính giá thành</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PO-2026-0001</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead className="text-right">CP vật liệu</TableHead>
                <TableHead className="text-right">Phân bổ hao hụt</TableHead>
                <TableHead className="text-right">Tiết kiệm tấm lẻ</TableHead>
                <TableHead className="text-right">Đơn giá</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ITEMS.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                  <TableCell className="text-right">{item.qty}</TableCell>
                  <TableCell className="text-right">{fmt(item.materialCost)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {fmt(item.wasteCost)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    -{fmt(item.remnantSavings)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {fmt(item.unitCost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
