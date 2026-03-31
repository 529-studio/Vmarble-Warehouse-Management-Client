import { Suspense } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Đăng nhập | Vmarble WMS' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
