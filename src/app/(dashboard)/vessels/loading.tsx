import { Skeleton } from '@/components/ui/skeleton'

export default function VesselsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-6 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
        </div>
        <Skeleton className="h-9 w-28 rounded" />
      </div>
      <div className="rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-5 flex-1 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
