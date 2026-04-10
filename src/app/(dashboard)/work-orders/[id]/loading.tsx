import { Skeleton } from '@/components/ui/skeleton'

export default function WorkOrderDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
