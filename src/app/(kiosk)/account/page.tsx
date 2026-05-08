import type { Metadata } from 'next'
import { AccountProfile } from './account-profile'

export const metadata: Metadata = { title: 'Tài khoản' }

export default function AccountPage() {
  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Tài khoản</h1>
      <AccountProfile />
    </div>
  )
}
