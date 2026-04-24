'use client'

import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logout } from '@/lib/hooks/use-auth'
import { getCurrentRoleFromCookie } from '@/lib/auth/authorization'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  accountant: 'Kế toán',
  planner: 'Kế hoạch',
  warehouse: 'Kho',
  cnc: 'CNC',
  foreman: 'Quản đốc',
  cnc_manager: 'QL CNC',
}

// useSyncExternalStore is the React-idiomatic way to read a browser-only value
// (document.cookie) without causing a hydration mismatch.
// getServerSnapshot returns null so SSR and initial client render agree;
// getSnapshot reads the actual cookie after hydration completes.
function useCurrentRole(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
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
          <Badge variant="secondary" className="text-base">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="default"
        className="min-h-[48px] gap-2 text-base"
        onClick={handleLogout}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Đăng xuất
      </Button>
    </div>
  )
}
