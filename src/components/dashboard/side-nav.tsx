'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, DollarSign, Layers, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/hooks/use-auth'

const NAV_ITEMS = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/remnants', label: 'Kho tấm lẻ', icon: Package },
  { href: '/costing', label: 'Giá thành', icon: DollarSign },
  { href: '/materials', label: 'Nguyên liệu', icon: Layers },
] as const

export function SideNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center px-5">
        <span className="text-base font-bold text-sidebar-foreground">
          Vmarble WMS
        </span>
      </div>

      <Separator />

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
