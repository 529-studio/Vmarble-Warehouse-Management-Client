'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, DollarSign, Layers, Boxes, ShoppingCart, ClipboardList, ClipboardCheck, Scissors, LogOut, UserCircle, Users, Truck, Trash2, QrCode, HardHat, Container as ContainerIcon, AlertTriangle, Recycle, FileWarning, BoxesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logout, useMe } from '@/lib/hooks/use-auth'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'

// Full management nav — visible to admin, accountant, planner, warehouse, cnc_manager
const MANAGEMENT_NAV = [
  { href: '/overview', label: 'Tổng quan', icon: LayoutDashboard, resource: 'overview' },
  { href: '/containers', label: 'Container', icon: ContainerIcon, resource: 'containers' },
  { href: '/loading-exceptions', label: 'Sự cố đóng hàng', icon: AlertTriangle, resource: 'loading_exceptions' },
  { href: '/fg-pool', label: 'Thành phẩm chờ xuất', icon: BoxesIcon, resource: 'fg_pool' },
  { href: '/pos', label: 'Đơn hàng', icon: ShoppingCart, resource: 'pos' },
  { href: '/plans', label: 'Kế hoạch SX', icon: ClipboardList, resource: 'plans' },
  { href: '/work-orders', label: 'Lệnh sản xuất', icon: ClipboardCheck, resource: 'work_orders' },
  { href: '/cutting-dispatch', label: 'Điều phối cắt', icon: Scissors, resource: 'cutting_dispatch' },
  { href: '/assembly', label: 'Xưởng gia công', icon: HardHat, resource: 'assembly' },
  { href: '/remnants', label: 'Kho tấm lẻ', icon: Package, resource: 'remnants' },
  { href: '/barcodes', label: 'Barcode', icon: QrCode, resource: 'barcodes' },
  { href: '/costing', label: 'Giá thành', icon: DollarSign, resource: 'costing' },
  { href: '/waste-report', label: 'Báo cáo hao hụt', icon: Trash2, resource: 'waste_report' },
  { href: '/scrap-sales', label: 'Bán phế liệu', icon: Recycle, resource: 'scrap_sales' },
  { href: '/material-rejections', label: 'Khiếu nại NCC', icon: FileWarning, resource: 'material_rejections' },
  { href: '/materials', label: 'Nguyên liệu', icon: Layers, resource: 'materials' },
  { href: '/purchasing', label: 'Đơn nhập VL', icon: Truck, resource: 'purchasing' },
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
  const { data: me } = useMe()

  const handleLogout = () => {
    logout()
    router.push('/login')
    router.refresh()
  }

  const displayName = me?.full_name || me?.username || ROLE_LABELS[role!] || role

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center px-5">
        <span className="text-base font-bold text-sidebar-foreground">
          Vmarble WMS
        </span>
      </div>

      <Separator />

      {/* Nav links — flex-1 + overflow-y-auto + min-h-0 so the list scrolls
          and the footer below stays anchored even on short viewports. */}
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
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

      <div className="space-y-1 border-t p-3">
        {/* Identity chip */}
        {role && (
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <UserCircle className="size-8 shrink-0 text-sidebar-foreground/60" aria-hidden="true" />
            <div className="min-w-0 flex-1 flex flex-col">
              <span className="truncate text-sm font-medium leading-none mb-1">
                {displayName}
              </span>
              <Badge variant="secondary" className="w-fit text-[10px] px-1 py-0 h-4 leading-none">
                {ROLE_LABELS[role] ?? role}
              </Badge>
            </div>
          </Link>
        )}

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 mt-1 text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
