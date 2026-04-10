'use client'

export default function WorkOrdersError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-12 text-center">
      <p className="text-sm text-destructive">{error.message ?? 'Đã xảy ra lỗi.'}</p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:no-underline"
      >
        Thử lại
      </button>
    </div>
  )
}
