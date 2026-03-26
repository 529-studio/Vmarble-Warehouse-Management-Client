import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: { children: 'Badge' },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

export const StatusBadges: Story = {
  name: 'Status Badges (WMS use-case)',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">AVAILABLE</Badge>
      <Badge variant="secondary">ALLOCATED</Badge>
      <Badge variant="outline">PLANNED</Badge>
      <Badge variant="destructive">DEPLETED</Badge>
    </div>
  ),
}
