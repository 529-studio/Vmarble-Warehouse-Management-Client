import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('gap-4 py-5', className)}>
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold leading-none">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-muted p-2">
              <Icon
                className={cn(
                  'size-5',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-destructive',
                  trend === 'neutral' && 'text-muted-foreground',
                  !trend && 'text-muted-foreground',
                )}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
