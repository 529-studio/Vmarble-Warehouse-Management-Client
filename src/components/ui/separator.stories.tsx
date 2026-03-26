import type { Meta, StoryObj } from '@storybook/react'
import { Separator } from './separator'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    decorative: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  render: () => (
    <div className="w-64 space-y-3">
      <p className="text-sm">Phần trên</p>
      <Separator />
      <p className="text-sm">Phần dưới</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-10 items-center gap-3">
      <span className="text-sm">Trái</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Phải</span>
    </div>
  ),
}
