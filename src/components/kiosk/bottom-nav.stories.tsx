import type { Meta, StoryObj } from '@storybook/react'
import { BottomNav } from './bottom-nav'

const meta: Meta<typeof BottomNav> = {
  title: 'Kiosk/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'mobile375' },
    /**
     * BottomNav uses `usePathname()` from next/navigation.
     * @storybook/nextjs-vite automatically mocks Next.js navigation hooks.
     * Set the mocked pathname via nextjs.navigation.pathname parameter.
     */
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/cutting-orders',
      },
    },
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof BottomNav>

export const CuttingOrdersActive: Story = {
  name: 'Active: Lệnh cắt',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/cutting-orders' } },
  },
}

export const ReportActive: Story = {
  name: 'Active: Báo cáo',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/report-cut' } },
  },
}

export const RemnantsActive: Story = {
  name: 'Active: Kho tấm lẻ',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/remnant-list' } },
  },
}

export const ScanActive: Story = {
  name: 'Active: Quét mã',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/scan' } },
  },
}

export const WithPageContent: Story = {
  name: 'Trong layout trang (có padding-bottom)',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/cutting-orders' } },
  },
  render: () => (
    <div className="min-h-[812px] bg-background pb-16">
      <main className="p-4">
        <p className="text-sm text-muted-foreground">
          Nội dung trang — BottomNav cố định ở dưới cùng.
        </p>
      </main>
      <BottomNav />
    </div>
  ),
}
