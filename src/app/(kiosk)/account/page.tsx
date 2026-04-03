import type { Metadata } from 'next'
import { User } from 'lucide-react'

export const metadata: Metadata = { title: 'Tài khoản' }

export default function AccountPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <User className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-bold">Tài khoản</h1>
      <p className="text-sm text-muted-foreground">
        Tính năng sẽ ra mắt trong Sprint 3.
      </p>
    </div>
  )
}
