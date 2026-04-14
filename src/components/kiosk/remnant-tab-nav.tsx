'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/remnant-store', label: 'Nhập kho' },
  { href: '/remnant-list', label: 'Tồn kho' },
] as const

export function RemnantTabNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {TABS.map(({ href, label }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 rounded-md py-2 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
