import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type OverflowStatus = 'GREEN' | 'YELLOW' | 'RED'

interface AlertBannerProps {
  status: OverflowStatus
  utilizationPct: number
  message: string
  className?: string
}

const STATUS_CONFIG: Record<
  OverflowStatus,
  {
    icon: typeof CheckCircle
    title: string
    className: string
  }
> = {
  GREEN: {
    icon: CheckCircle,
    title: 'Kho tấm lẻ bình thường',
    className: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  },
  YELLOW: {
    icon: AlertCircle,
    title: 'Kho tấm lẻ sắp đầy',
    className: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  },
  RED: {
    icon: AlertTriangle,
    title: 'Kho tấm lẻ quá tải — Tạm ngừng xuất tấm nguyên',
    className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  },
}

export function AlertBanner({
  status,
  utilizationPct,
  message,
  className,
}: AlertBannerProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Alert className={cn(config.className, className)}>
      <Icon className="size-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>
        {message} ({utilizationPct.toFixed(1)}% tận dụng)
      </AlertDescription>
    </Alert>
  )
}
