import { Skeleton } from '@/components/ui/skeleton'

export default function RemnantListLoading() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <Skeleton className="h-7 w-40" />

      {/* Filter bar */}
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>

      {/* Cards — mirror real card layout */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-5 w-16" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
