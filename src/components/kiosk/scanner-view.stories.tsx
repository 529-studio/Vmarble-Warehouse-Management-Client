import type { Meta, StoryObj } from '@storybook/react'
import { ScannerView } from './scanner-view'
import { fn } from 'storybook/test'

const meta: Meta<typeof ScannerView> = {
  title: 'Kiosk/ScannerView',
  component: ScannerView,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile375' },
  },
  args: {
    onScan: fn(),
  },
}

export default meta
type Story = StoryObj<typeof ScannerView>

/**
 * NOTE: Storybook runs in a browser without a real camera feed.
 * The component will auto-fall back to the manual input mode when
 * `html5-qrcode` can't access the camera — which is the expected
 * Storybook behaviour.
 */
export const Default: Story = {
  name: 'Camera mode (falls back to manual in Storybook)',
}

export const ManualInputMode: Story = {
  name: 'Manual input (simulated camera error)',
  /**
   * We can't force camera failure programmatically, but the Default story
   * already shows the manual fallback in most CI / sandbox environments.
   * This story documents what the manual mode looks like intentionally.
   */
  render: (args) => (
    <div className="max-w-[375px] space-y-2 p-4">
      <p className="text-sm font-medium">Nhập mã thủ công (camera không khả dụng)</p>
      <ScannerView {...args} />
    </div>
  ),
}
