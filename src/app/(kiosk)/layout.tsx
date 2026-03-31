import type { Metadata } from 'next'
import { BottomNav } from '@/components/kiosk/bottom-nav'
import { KioskLogoutButton } from '@/components/kiosk/logout-button'

export const metadata: Metadata = {
  title: {
    template: '%s | Kiosk',
    default: 'Kiosk',
  },
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Kiosk header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-4 shadow-sm">
        <span className="text-base font-semibold">Vmarble Kiosk</span>
        <KioskLogoutButton />
      </header>

      {/* Page content — padded bottom for fixed nav */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  )
}
