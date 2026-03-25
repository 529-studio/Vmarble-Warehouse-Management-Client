import { Skeleton } from '@/components/ui/skeleton'

export default function OverviewLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
