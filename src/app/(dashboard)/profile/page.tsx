import type { Metadata } from 'next'
import { ProfileContent } from './profile-content'

export const metadata: Metadata = { title: 'Thông tin tài khoản' }

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông tin tài khoản</h1>
        <p className="text-muted-foreground">
          Chi tiết hồ sơ và quyền hạn của bạn trong hệ thống
        </p>
      </div>
      <ProfileContent />
    </div>
  )
}
