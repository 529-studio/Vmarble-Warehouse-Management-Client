import type { Metadata } from 'next'
import { RemnantListClient } from './client'

export const metadata: Metadata = { title: 'Kho tấm lẻ' }

export default function RemnantListPage() {
  return <RemnantListClient />
}
