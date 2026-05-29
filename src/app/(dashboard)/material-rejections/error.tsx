'use client'

import { Button } from '@/components/ui/button'
import { mapApiErrorVi } from '@/lib/api/client'

export default function MaterialRejectionsError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-semibold">Không thể tải trang Khiếu nại NCC</h2>
      <p className="text-sm text-muted-foreground">
        {mapApiErrorVi(error, 'Vui lòng thử lại sau ít phút.')}
      </p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  )
}
