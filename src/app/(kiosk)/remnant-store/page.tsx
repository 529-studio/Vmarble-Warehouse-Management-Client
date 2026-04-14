import type { Metadata } from 'next'
import { RemnantTabNav } from '@/components/kiosk/remnant-tab-nav'
import { RemnantStoreClient } from '@/components/kiosk/remnant-store-client'

export const metadata: Metadata = { title: 'Nhập kho tấm lẻ' }

export default function RemnantStorePage() {
  return (
    <div className="space-y-4 p-4">
      <RemnantTabNav />
      <RemnantStoreClient />
    </div>
  )
}
