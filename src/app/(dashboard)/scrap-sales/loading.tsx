import { Skeleton } from '@/components/ui/skeleton'

export default function ScrapSalesLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
