import { Skeleton } from '@/components/ui/skeleton'

export default function PurchasingDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
