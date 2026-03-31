import type { Metadata } from 'next'
import { RemnantStoreClient } from '@/components/kiosk/remnant-store-client'

export const metadata: Metadata = { title: 'Nhập kho tấm lẻ' }

export default function RemnantStorePage() {
  return <RemnantStoreClient />
}
