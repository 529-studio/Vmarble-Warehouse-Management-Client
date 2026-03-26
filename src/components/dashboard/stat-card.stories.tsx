import type { Meta, StoryObj } from '@storybook/react'
import { Package, TrendingDown, TrendingUp, Minus, Layers, DollarSign } from 'lucide-react'
import { StatCard } from './stat-card'

const meta: Meta<typeof StatCard> = {
  title: 'Dashboard/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'desktop1280' },
  },
  argTypes: {
    trend: {
      control: 'select',
      options: ['up', 'down', 'neutral', undefined],
    },
  },
}

export default meta
type Story = StoryObj<typeof StatCard>

export const Default: Story = {
  args: {
    title: 'Tổng tấm lẻ',
    value: '148',
    description: 'Hiện có trong kho',
    icon: Package,
  },
}

export const TrendUp: Story = {
  args: {
    title: 'Tỷ lệ tái sử dụng',
    value: '73.2%',
    description: '+5.4% so với tháng trước',
    icon: TrendingUp,
    trend: 'up',
  },
}

export const TrendDown: Story = {
  args: {
    title: 'Tấm hết hạn',
    value: '12',
    description: '–3 so với tuần trước',
    icon: TrendingDown,
    trend: 'down',
  },
}

export const TrendNeutral: Story = {
  args: {
    title: 'Tổng lệnh cắt',
    value: '64',
    description: 'Không đổi so với hôm qua',
    icon: Minus,
    trend: 'neutral',
  },
}

export const NoIcon: Story = {
  args: {
    title: 'Diện tích tổng',
    value: '24.5 m²',
    description: 'Tổng diện tích tấm lẻ khả dụng',
  },
}

export const DashboardGrid: Story = {
  name: 'Dashboard grid (4 cards)',
  render: () => (
    <div className="grid grid-cols-4 gap-4 p-4">
      <StatCard title="Tổng tấm lẻ" value="148" icon={Package} trend="neutral" description="Trong kho" />
      <StatCard title="Tỷ lệ tái sử dụng" value="73.2%" icon={TrendingUp} trend="up" description="+5.4% tháng này" />
      <StatCard title="Tấm hết hạn" value="12" icon={Layers} trend="down" description="Cần xử lý" />
      <StatCard title="Giá trị tồn kho" value="₫48.2M" icon={DollarSign} trend="neutral" description="Ước tính" />
    </div>
  ),
}
