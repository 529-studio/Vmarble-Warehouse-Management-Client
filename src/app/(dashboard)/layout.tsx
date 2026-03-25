import type { Metadata } from 'next'
import { SideNav } from '@/components/dashboard/side-nav'

export const metadata: Metadata = {
  title: {
    template: '%s | Dashboard',
    default: 'Dashboard',
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Fixed sidebar */}
      <SideNav />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-muted/30 p-6 md:ml-60">
        {children}
      </main>
    </div>
  )
}
