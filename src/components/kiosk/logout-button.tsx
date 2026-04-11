'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logout } from '@/lib/hooks/use-auth'

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
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)auth_role=([^;]+)/)
    setRole(match ? decodeURIComponent(match[1]) : null)
  }, [])
  return role
}

export function KioskLogoutButton() {
  const router = useRouter()
  const role = useCurrentRole()

  const handleLogout = () => {
    logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {role && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <UserCircle className="size-4 shrink-0" aria-hidden="true" />
          <Badge variant="secondary" className="text-xs">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={handleLogout}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Đăng xuất
      </Button>
    </div>
  )
}
