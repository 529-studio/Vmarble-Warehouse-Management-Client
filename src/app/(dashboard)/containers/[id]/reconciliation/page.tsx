'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileSearch, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleGate } from '@/components/auth/role-gate'
import { LifecycleDialog } from '@/components/containers/lifecycle-dialog'
import {
  ReconciliationCounter,
  ReconciliationMatrix,
} from '@/components/containers/reconciliation-matrix'
import { ExceptionPanel } from '@/components/containers/exception-panel'
import { useContainer } from '@/lib/hooks/use-containers'
import { useActiveLoadingPlan } from '@/lib/hooks/use-loading-plans'
import { useContainerExceptions } from '@/lib/hooks/use-loading-exceptions'
import {
  computeSealBlockers,
  reconcile,
  type SealBlocker,
} from '@/lib/delivery/reconciliation'
import type { ContainerStatus } from '@/types/api'

const STATUS_LABEL: Record<ContainerStatus, string> = {
  OPEN: 'Mở',
  LOADING: 'Đang xếp',
  SEALED: 'Đã niêm phong',
  SHIPPED: 'Đã xuất',
  CANCELLED: 'Đã huỷ',
}

const STATUS_BADGE_VARIANT: Record<
  ContainerStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  OPEN: 'outline',
  LOADING: 'default',
  SEALED: 'secondary',
  SHIPPED: 'secondary',
  CANCELLED: 'destructive',
}

function formatBlocker(b: SealBlocker): string {
  if (b.kind === 'EXCEPTION_PENDING') {
    return `Exception ${b.exception_type} đang chờ duyệt`
  }
  return `${b.sku_code} dư ${b.delta} chưa có exception OVER_LOADED approved`
}

export default function ReconciliationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: containerId } = use(params)

  const { data: container, isLoading, isError } = useContainer(containerId)
  const { data: plan } = useActiveLoadingPlan(containerId)
  const { data: exData } = useContainerExceptions(containerId, { limit: 100 })
  const [sealOpen, setSealOpen] = useState(false)

  const reconciliation = useMemo(
    () => reconcile(plan?.lines ?? [], container?.lines ?? []),
    [plan?.lines, container?.lines],
  )

  const blockers = useMemo(
    () => computeSealBlockers(reconciliation, exData?.items ?? []),
    [reconciliation, exData?.items],
  )

  const editable = container?.status === 'OPEN' || container?.status === 'LOADING'
  const sealDisabled = !editable || blockers.length > 0
  const sealTitle =
    blockers.length > 0
      ? `Không thể seal:\n• ${blockers.map(formatBlocker).join('\n• ')}`
      : !editable
      ? 'Container không ở trạng thái cho phép seal.'
      : 'Niêm phong container'

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !container) {
    return (
      <div className="space-y-4">
        <Link
          href="/containers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại Container
        </Link>
        <p className="text-sm text-destructive">Không thể tải container.</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/containers/${containerId}/loading`}
                aria-label="Quay lại loading"
              >
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <FileSearch className="size-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                {container.code} · Reconciliation
              </h1>
              <p className="text-sm text-muted-foreground">Plan vs Actual.</p>
            </div>
          </div>
        </header>

        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm">Container chưa có loading plan.</p>
            <Button asChild>
              <Link href={`/containers/${containerId}/loading`}>
                Upload Excel packing list
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/containers/${containerId}/loading`}
              aria-label="Quay lại loading"
            >
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <FileSearch className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold leading-tight">
              {container.code} · Reconciliation
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{container.container_type}</Badge>
              <Badge variant={STATUS_BADGE_VARIANT[container.status]}>
                {STATUS_LABEL[container.status]}
              </Badge>
              <ReconciliationCounter summary={reconciliation.summary} />
            </div>
          </div>
        </div>

        <RoleGate min="PLANNER">
          <Button
            onClick={() => setSealOpen(true)}
            disabled={sealDisabled}
            title={sealTitle}
          >
            <Lock className="size-4" /> Niêm phong
          </Button>
        </RoleGate>
      </header>

      {blockers.length > 0
        && container.status !== 'SEALED'
        && container.status !== 'SHIPPED' && (
          <Card className="border-amber-300 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-amber-900">
                {blockers.length} điều kiện chưa đạt để niêm phong
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                {blockers.map((b, i) => (
                  <li key={i}>{formatBlocker(b)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Matrix Plan vs Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconciliationMatrix reconciliation={reconciliation} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Exception</CardTitle>
        </CardHeader>
        <CardContent>
          <ExceptionPanel containerId={containerId} alwaysOpen />
        </CardContent>
      </Card>

      <LifecycleDialog
        open={sealOpen}
        action={sealOpen ? 'seal' : null}
        containerId={containerId}
        containerCode={container.code}
        onCompleted={() => {
          setSealOpen(false)
          toast.success('Đã niêm phong container.')
        }}
        onCancel={() => setSealOpen(false)}
      />
    </div>
  )
}
