'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/hooks/use-auth'

export function KioskLogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
    router.refresh()
  }

  return (
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
  )
}
