import { Skeleton } from '@/components/ui/skeleton'

export default function PurchasingLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
