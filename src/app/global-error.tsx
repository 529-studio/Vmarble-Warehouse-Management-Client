'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="vi">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
          <h2 className="text-2xl font-bold">Có lỗi xảy ra</h2>
          <p className="text-sm text-gray-600">{error.message}</p>
          {error.digest && (
            <p className="font-mono text-xs text-gray-400">
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  )
}
