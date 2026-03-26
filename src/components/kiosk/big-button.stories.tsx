import type { Meta, StoryObj } from '@storybook/react'
import { BigButton } from './big-button'

const meta: Meta<typeof BigButton> = {
  title: 'Kiosk/BigButton',
  component: BigButton,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile375' },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof BigButton>

export const Primary: Story = {
  args: { children: 'Báo cáo hoàn thành', variant: 'primary' },
}

export const Secondary: Story = {
  args: { children: 'Xem chi tiết', variant: 'secondary' },
}

export const Danger: Story = {
  args: { children: 'Hủy lệnh cắt', variant: 'danger' },
}

export const Disabled: Story = {
  args: { children: 'Không thể nhấn', variant: 'primary', disabled: true },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-[375px] p-4">
      <BigButton variant="primary">Báo cáo hoàn thành</BigButton>
      <BigButton variant="secondary">Xem chi tiết lệnh</BigButton>
      <BigButton variant="danger">Hủy lệnh cắt</BigButton>
      <BigButton variant="primary" disabled>Không thể nhấn</BigButton>
    </div>
  ),
}
