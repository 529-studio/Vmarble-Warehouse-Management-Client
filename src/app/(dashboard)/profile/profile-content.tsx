'use client'

import { useSyncExternalStore } from 'react'
import { UserCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useMe } from '@/lib/hooks/use-auth'
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

export function ProfileContent() {
  const role = useCurrentRole()
  const { data: me, isLoading, isError } = useMe()

  if (!role || isLoading) {
    return (
      <div className="flex animate-pulse flex-col gap-8 max-w-2xl">
        <div className="h-64 w-full rounded-xl bg-muted" />
      </div>
    )
  }

  const username = me?.username ?? '—'
  const fullName = me?.full_name ?? '—'

  return (
    <div className="max-w-2xl">
      <div className="flex flex-col gap-8 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-6">
          <UserCircle className="size-24 text-muted-foreground" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">{username}</h2>
            <div>
              <Badge variant="secondary" className="text-base">
                {ROLE_LABELS[role] ?? role}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <span className="text-muted-foreground">Họ tên</span>
            <span className="col-span-2 font-medium">{fullName}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <span className="text-muted-foreground">Quyền truy cập</span>
            <span className="col-span-2 font-medium">{ROLE_LABELS[role] ?? role}</span>
          </div>
        </div>
        
        {isError && (
          <p className="text-sm text-destructive mt-4" role="alert">
            Không thể tải thông tin tài khoản đầy đủ. Vui lòng đăng nhập lại.
          </p>
        )}
      </div>
    </div>
  )
}
