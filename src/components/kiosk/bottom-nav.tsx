'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scissors, ClipboardList, Package, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    href: '/cutting-orders',
    label: 'Lệnh cắt',
    icon: ClipboardList,
  },
  {
    href: '/report-cut',
    label: 'Báo cáo',
    icon: Scissors,
  },
  {
    href: '/remnant-list',
    label: 'Kho tấm lẻ',
    icon: Package,
  },
  {
    href: '/scan',
    label: 'Quét mã',
    icon: QrCode,
  },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.08)]">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon
              className={cn('size-6', active && 'stroke-[2.5]')}
              aria-hidden="true"
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
