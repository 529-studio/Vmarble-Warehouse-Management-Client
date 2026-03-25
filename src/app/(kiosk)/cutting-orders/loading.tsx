import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function CuttingOrdersLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-7 w-48" />
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-2 h-5 w-24" />
            <Skeleton className="mb-1 h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
