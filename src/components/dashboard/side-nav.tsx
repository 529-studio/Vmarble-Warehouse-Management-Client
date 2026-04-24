'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, DollarSign, Layers, Boxes, ShoppingCart, ClipboardList, ClipboardCheck, Scissors, LogOut, UserCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logout } from '@/lib/hooks/use-auth'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'

// Full management nav — visible to admin, accountant, planner, warehouse, cnc_manager
const MANAGEMENT_NAV = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard, resource: 'overview' },
  { href: '/pos', label: 'Đơn hàng', icon: ShoppingCart, resource: 'pos' },
  { href: '/plans', label: 'Kế hoạch SX', icon: ClipboardList, resource: 'plans' },
  { href: '/work-orders', label: 'Lệnh sản xuất', icon: ClipboardCheck, resource: 'work_orders' },
  { href: '/cutting-dispatch', label: 'Điều phối cắt', icon: Scissors, resource: 'cutting_dispatch' },
  { href: '/remnants', label: 'Kho tấm lẻ', icon: Package, resource: 'remnants' },
  { href: '/costing', label: 'Giá thành', icon: DollarSign, resource: 'costing' },
  { href: '/materials', label: 'Nguyên liệu', icon: Layers, resource: 'materials' },
  { href: '/skus', label: 'Sản phẩm', icon: Boxes, resource: 'skus' },
  { href: '/users', label: 'Người dùng', icon: Users, resource: 'users' },
] as const

function navItemsForRole(role: string | null) {
  if (!role) return []
  return MANAGEMENT_NAV.filter((item) => can(role, 'read', item.resource))
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Kế toán',
  planner: 'Kế hoạch',
  warehouse: 'Kho',
  cnc: 'CNC',
  foreman: 'Quản đốc',
  cnc_manager: 'QL CNC',
}

function useCurrentRole(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

export function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const role = useCurrentRole()

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
        {navItemsForRole(role).map(({ href, label, icon: Icon }) => {
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

      <div className="mt-auto space-y-1 p-3">
        {/* Identity chip */}
        {role && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <UserCircle className="size-5 shrink-0 text-sidebar-foreground/60" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[role] ?? role}
              </Badge>
            </div>
          </div>
        )}

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
