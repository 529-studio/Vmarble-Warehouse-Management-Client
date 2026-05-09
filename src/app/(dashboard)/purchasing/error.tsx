'use client'

export default function PurchasingError({ error }: { error: Error }) {
  return (
    <div className="p-6 text-sm text-destructive">
      Không thể tải trang đơn nhập vật liệu: {error.message}
    </div>
  )
}
