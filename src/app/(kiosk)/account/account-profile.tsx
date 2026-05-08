'use client'

import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logout, useMe } from '@/lib/hooks/use-auth'
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

function useCurrentRole(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

export function AccountProfile() {
  const router = useRouter()
  const role = useCurrentRole()
  const { data: me, isLoading, isError } = useMe()

  const handleLogout = () => {
    logout()
    router.push('/login')
    router.refresh()
  }

  // Prevent hydration mismatch by returning a skeleton if role isn't loaded
  if (!role || isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-8">
        <div className="h-64 w-full rounded-xl bg-muted" />
        <div className="h-12 w-full rounded-md bg-muted" />
      </div>
    )
  }

  const username = me?.username ?? '—'
  const fullName = me?.full_name ?? '—'
  
  // Optional: tracking last login date might be added later, for now hide or fallback.
  // const lastLogin = '—' 

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <UserCircle className="size-20 text-muted-foreground" aria-hidden="true" />

        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold">{username}</h2>
          <Badge variant="secondary" className="text-base">
            {ROLE_LABELS[role] ?? role}
          </Badge>
        </div>

        <div className="w-full space-y-4 pt-4 text-left">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted-foreground">Họ tên</span>
            <span className="font-medium">{fullName}</span>
          </div>
        </div>
      </div>

      {isError && (
        <p className="text-center text-sm text-destructive" role="alert">
          Không thể tải thông tin tài khoản. Vui lòng đăng nhập lại.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="min-h-[48px] w-full gap-2 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="size-5" aria-hidden="true" />
        Đăng xuất
      </Button>
    </div>
  )
}
