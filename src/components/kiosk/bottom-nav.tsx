'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scissors, ClipboardList, Package, User, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'

function useCurrentRole(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

// cnc is the only kiosk role — all items are visible to every kiosk user.
const NAV_ITEMS = [
  { href: '/cutting-orders', label: 'Lệnh cắt', icon: Scissors, resource: 'cutting_orders' },
  { href: '/report-cut', label: 'Báo cáo', icon: ClipboardList, resource: 'report_cut' },
  { href: '/scan', label: 'Quét mã', icon: QrCode, resource: 'scan' },
  { href: '/remnant-store', label: 'Tấm lẻ', icon: Package, resource: 'remnant_store' },
  { href: '/account', label: 'Tài khoản', icon: User, resource: 'account' },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const role = useCurrentRole()
  const navItems = NAV_ITEMS.filter((item) => can(role, 'read', item.resource))

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-20 items-stretch justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          pathname.startsWith(href + '/') ||
          // Highlight "Tấm lẻ" tab for both remnant-store and remnant-list
          (href === '/remnant-store' && pathname.startsWith('/remnant-list'))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'tap-transparent relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 py-2 text-sm font-medium transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <span className="absolute inset-x-0 top-0 h-0.5 rounded-b bg-primary" />
            )}
            <Icon
              className={cn('size-6', active && 'stroke-[2.5]')}
              aria-hidden="true"
            />
            <span className="text-base leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
