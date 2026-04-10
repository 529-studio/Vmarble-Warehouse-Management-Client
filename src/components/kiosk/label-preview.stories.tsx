import type { Meta, StoryObj } from '@storybook/react'
import type { BarcodeRecord } from '@/types/api'
import { LabelPreview } from './label-preview'

const BARCODE_A: BarcodeRecord = {
  id: '544b6a48-240a-43b6-82cb-2308e24f3e4b',
  work_order_id: 'wo-0001-0001-0001-0001',
  sku_id: 'sku-0001-0001-0001-0001',
  po_id: 'po-0001-0001-0001-0001',
  production_plan_id: 'pp-0001-0001-0001-0001',
  sku_code: 'PLY-18-A-WG',
  sku_name: 'Gỗ công nghiệp 18mm — vân A',
  dimensions: '600×300×18mm',
  produced_date: '2024-01-15T08:00:00Z',
  created_at: '2024-01-15T08:30:00Z',
}

const BARCODE_B: BarcodeRecord = {
  id: '35b565ff-d0e6-4161-b30f-dc43daa45d9c',
  work_order_id: 'wo-0002-0002-0002-0002',
  sku_id: 'sku-0002-0002-0002-0002',
  po_id: 'po-0002-0002-0002-0002',
  production_plan_id: 'pp-0002-0002-0002-0002',
  sku_code: 'PLY-12-B-CG',
  sku_name: 'Gỗ công nghiệp 12mm — vân B',
  dimensions: '1200×600×12mm',
  produced_date: '2024-03-20T07:00:00Z',
  created_at: '2024-03-20T07:45:00Z',
}

const meta: Meta<typeof LabelPreview> = {
  title: 'Kiosk/LabelPreview',
  component: LabelPreview,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile375' },
    backgrounds: { default: 'light' },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'large'],
    },
  },
}

export default meta
type Story = StoryObj<typeof LabelPreview>

export const SmallLabel: Story = {
  name: 'Small label (50×30mm)',
  args: { barcode: BARCODE_A, size: 'small' },
}

export const LargeLabel: Story = {
  name: 'Large label (100×70mm)',
  args: { barcode: BARCODE_A, size: 'large' },
}

export const SmallLabelB: Story = {
  name: 'Small label — alternate SKU',
  args: { barcode: BARCODE_B, size: 'small' },
}

export const SideBySide: Story = {
  name: 'Both sizes side by side',
  render: () => (
    <div className="flex flex-wrap gap-6 p-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Small (50×30mm)</p>
        <LabelPreview barcode={BARCODE_A} size="small" />
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Large (100×70mm)</p>
        <LabelPreview barcode={BARCODE_A} size="large" />
      </div>
    </div>
  ),
}
