import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const REMNANTS = [
  { id: 'REM-001', sku: 'PLY-18-A', dims: '600×300×18', status: 'AVAILABLE', lot: 'L2024-01' },
  { id: 'REM-002', sku: 'MDF-12-B', dims: '450×250×12', status: 'ALLOCATED', lot: 'L2024-02' },
  { id: 'REM-003', sku: 'HDF-08-A', dims: '800×400×8', status: 'USED', lot: 'L2024-01' },
  { id: 'REM-004', sku: 'PLY-25-A', dims: '350×200×25', status: 'AVAILABLE', lot: 'L2024-03' },
]

const statusVariant = (status: string) => {
  if (status === 'AVAILABLE') return 'default' as const
  if (status === 'ALLOCATED') return 'secondary' as const
  if (status === 'USED') return 'outline' as const
  return 'destructive' as const
}

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Table>

export const RemnantTable: Story = {
  name: 'Remnant inventory table',
  render: () => (
    <Table>
      <TableCaption>Danh sách tấm lẻ trong kho</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Kích thước (mm)</TableHead>
          <TableHead>Lô</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {REMNANTS.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell>{r.sku}</TableCell>
            <TableCell className="font-mono text-xs">{r.dims}</TableCell>
            <TableCell className="text-muted-foreground">{r.lot}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}

export const EmptyTable: Story = {
  name: 'Empty state table',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
            Không có dữ liệu
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
}
