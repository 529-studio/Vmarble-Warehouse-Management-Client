'use client'

import Link from 'next/link'
import { BigButton } from '@/components/kiosk/big-button'

export default function CheckpointScanError() {
  return (
    <div className="space-y-4 p-4">
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
        Không thể tải màn hình quét checkpoint.
      </p>
      <Link href="/scan" className="block">
        <BigButton variant="secondary">Quay lại chọn công đoạn</BigButton>
      </Link>
    </div>
  )
}
