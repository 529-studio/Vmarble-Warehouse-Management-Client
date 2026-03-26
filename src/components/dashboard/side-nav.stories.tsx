import type { Meta, StoryObj } from '@storybook/react'
import { SideNav } from './side-nav'

const meta: Meta<typeof SideNav> = {
  title: 'Dashboard/SideNav',
  component: SideNav,
  tags: ['autodocs'],
  parameters: {
    viewport: { defaultViewport: 'desktop1280' },
    layout: 'fullscreen',
    /**
     * @storybook/nextjs-vite mocks Next.js navigation hooks automatically.
     * Use nextjs.navigation.pathname to control the active item.
     */
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/overview',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SideNav>

export const OverviewActive: Story = {
  name: 'Active: Tổng quan',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/overview' } },
  },
}

export const RemnantsActive: Story = {
  name: 'Active: Kho tấm lẻ',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/remnants' } },
  },
}

export const CostingActive: Story = {
  name: 'Active: Giá thành',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/costing' } },
  },
}

export const WithPageContent: Story = {
  name: 'Trong layout trang (với main content)',
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/overview' } },
  },
  render: () => (
    <div className="min-h-screen bg-background">
      <SideNav />
      <main className="ml-60 p-6">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nội dung dashboard — SideNav chiếm 240px bên trái.
        </p>
      </main>
    </div>
  ),
}
