import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ReportCutForm } from '@/components/kiosk/report-cut-form'

export const metadata: Metadata = { title: 'Báo cáo kết quả cắt' }

// ── Skeleton shown while the client component hydrates ───────────────────────

function ReportCutSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* Card 1 — used dimension */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Card 2 — remnant */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
//
// The page itself is a server component (no 'use client') so it can export
// metadata. The actual form logic lives in ReportCutForm (client component)
// wrapped in Suspense because useSearchParams() requires it in Next.js App Router.

export default function ReportCutPage() {
  return (
    <Suspense fallback={<ReportCutSkeleton />}>
      <ReportCutForm />
    </Suspense>
  )
}
