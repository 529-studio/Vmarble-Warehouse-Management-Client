'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="text-sm text-destructive">
        {error.message || 'Đã xảy ra lỗi khi tải trang.'}
      </p>
      <button
        onClick={reset}
        className="text-sm text-primary hover:underline"
      >
        Thử lại
      </button>
    </div>
  )
}
