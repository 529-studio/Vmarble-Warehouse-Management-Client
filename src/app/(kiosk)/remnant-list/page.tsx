import type { Metadata } from 'next'
import { RemnantTabNav } from '@/components/kiosk/remnant-tab-nav'
import { RemnantListClient } from './client'

export const metadata: Metadata = { title: 'Kho tấm lẻ' }

export default function RemnantListPage() {
  return (
    <div className="p-4">
      <RemnantTabNav />
      <RemnantListClient />
    </div>
  )
}
