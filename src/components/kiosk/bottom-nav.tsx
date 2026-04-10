'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Scissors, ClipboardList, ClipboardCheck, Package, User, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

// Items shown to every kiosk role
const COMMON_ITEMS = [
  { href: '/scan',         label: 'Quét mã',    icon: QrCode },
  { href: '/remnant-list', label: 'Kho tấm lẻ', icon: Package },
  { href: '/account',      label: 'Tài khoản',  icon: User },
] as const

// Extra items per role (prepended before the common items)
const ROLE_ITEMS: Record<string, { href: string; label: string; icon: React.ElementType }[]> = {
  cnc: [
    { href: '/cutting-orders', label: 'Lệnh cắt', icon: Scissors },
    { href: '/report-cut',     label: 'Báo cáo',  icon: ClipboardList },
  ],
  foreman: [
    { href: '/cutting-orders', label: 'Lệnh cắt',   icon: Scissors },
    { href: '/work-orders',    label: 'Lệnh SX',     icon: ClipboardCheck },
    { href: '/report-cut',     label: 'Báo cáo',     icon: ClipboardList },
  ],
}

function useRole(): string | null {
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)auth_role=([^;]+)/)
    setRole(match ? decodeURIComponent(match[1]) : null)
  }, [])
  return role
}

export function BottomNav() {
  const pathname = usePathname()
  const role = useRole()

  const roleSpecific = role ? (ROLE_ITEMS[role] ?? []) : []
  const navItems = [...roleSpecific, ...COMMON_ITEMS]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-stretch justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'tap-transparent relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
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
            <span className="text-[12px] leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
