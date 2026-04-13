'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function RemnantListError({ reset }: { reset: () => void }) {
  const router = useRouter()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-base font-medium">Không thể tải danh sách tấm lẻ</p>
      <p className="text-sm text-muted-foreground">Kiểm tra kết nối mạng và thử lại.</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  )
}
