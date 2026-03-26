import type { Meta, StoryObj } from '@storybook/react'
import type { BarcodeRecord } from '@/types/api'
import { LabelPreview } from './label-preview'

const BARCODE_WIP: BarcodeRecord = {
  id: 'bc-0001-0001-0001-0001',
  entityType: 'WIP',
  entityId: 'wip-001',
  sku: 'PLY-18-A-WG',
  dimensions: { lengthMm: 600, widthMm: 300, thicknessMm: 18 },
  lot: 'L2024-01',
  location: 'A-01',
  qrContent: 'https://wms.vmarble.vn/bc/bc-0001',
  createdAt: '2024-01-15T08:00:00Z',
}

const BARCODE_REMNANT: BarcodeRecord = {
  id: 'bc-0002-0002-0002-0002',
  entityType: 'REMNANT',
  entityId: 'rem-002',
  sku: null,
  dimensions: { lengthMm: 350, widthMm: 200, thicknessMm: 18 },
  lot: 'L2024-01',
  location: null,
  qrContent: 'https://wms.vmarble.vn/bc/bc-0002',
  createdAt: '2024-01-16T10:30:00Z',
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

export const SmallWIP: Story = {
  name: 'Small label — WIP (50×30mm)',
  args: { barcode: BARCODE_WIP, size: 'small' },
}

export const LargeWIP: Story = {
  name: 'Large label — WIP (100×70mm)',
  args: { barcode: BARCODE_WIP, size: 'large' },
}

export const SmallRemnant: Story = {
  name: 'Small label — Remnant (no SKU, no location)',
  args: { barcode: BARCODE_REMNANT, size: 'small' },
}

export const LargeRemnant: Story = {
  name: 'Large label — Remnant',
  args: { barcode: BARCODE_REMNANT, size: 'large' },
}

export const SideBySide: Story = {
  name: 'Both sizes side by side',
  render: () => (
    <div className="flex flex-wrap gap-6 p-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Small (50×30mm)</p>
        <LabelPreview barcode={BARCODE_WIP} size="small" />
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Large (100×70mm)</p>
        <LabelPreview barcode={BARCODE_WIP} size="large" />
      </div>
    </div>
  ),
}
