import type { Meta, StoryObj } from '@storybook/react'
import { AlertBanner } from './alert-banner'

const meta: Meta<typeof AlertBanner> = {
  title: 'Dashboard/AlertBanner',
  component: AlertBanner,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'desktop1280' },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['GREEN', 'YELLOW', 'RED'],
    },
    utilizationPct: { control: { type: 'range', min: 0, max: 100, step: 0.5 } },
    message: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof AlertBanner>

export const Green: Story = {
  args: {
    status: 'GREEN',
    utilizationPct: 42.5,
    message: 'Kho đang hoạt động bình thường',
  },
}

export const Yellow: Story = {
  args: {
    status: 'YELLOW',
    utilizationPct: 78.3,
    message: 'Kho sắp đầy — cân nhắc xuất tấm lẻ',
  },
}

export const Red: Story = {
  args: {
    status: 'RED',
    utilizationPct: 96.1,
    message: 'Kho quá tải — tạm ngừng nhận tấm nguyên mới',
  },
}

export const AllStatuses: Story = {
  name: 'All statuses',
  render: () => (
    <div className="flex flex-col gap-4 max-w-2xl p-4">
      <AlertBanner
        status="GREEN"
        utilizationPct={42.5}
        message="Kho đang hoạt động bình thường"
      />
      <AlertBanner
        status="YELLOW"
        utilizationPct={78.3}
        message="Kho sắp đầy — cân nhắc xuất tấm lẻ"
      />
      <AlertBanner
        status="RED"
        utilizationPct={96.1}
        message="Kho quá tải — tạm ngừng nhận tấm nguyên mới"
      />
    </div>
  ),
}
