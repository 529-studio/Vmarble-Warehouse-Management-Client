'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleGate } from '@/components/auth/role-gate'
import { ApproveExceptionDialog } from '@/components/containers/approve-exception-dialog'
import { useContainerExceptions } from '@/lib/hooks/use-loading-exceptions'
import type { LoadingException } from '@/types/api'

const TYPE_LABEL: Record<string, string> = {
  SHORT_SHIPPED: 'Thiếu hàng',
  OVER_LOADED: 'Dư hàng',
  WRONG_SKU: 'Sai SKU',
  SUBSTITUTION: 'Thay thế',
  DAMAGED_AT_LOADING: 'Hỏng khi xếp',
  UNPLANNED_UNIT: 'Ngoài plan',
  CUSTOMER_CHANGE: 'Khách đổi',
}

const TYPE_BADGE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  SHORT_SHIPPED: 'outline',
  OVER_LOADED: 'destructive',
  WRONG_SKU: 'destructive',
  SUBSTITUTION: 'secondary',
  DAMAGED_AT_LOADING: 'destructive',
  UNPLANNED_UNIT: 'destructive',
  CUSTOMER_CHANGE: 'secondary',
}

const RESOLUTION_LABEL: Record<string, string> = {
  BACKORDER: 'Backorder',
  CANCEL_FROM_SO: 'Cancel SO',
  SUBSTITUTE_ACCEPTED: 'Thay thế',
  WRITE_OFF: 'Write-off',
  DEFER_TO_NEXT: 'Defer',
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function ExceptionStatusBadge({ ex }: { ex: LoadingException }) {
  if (!ex.approved_by) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700">
        Pending
      </Badge>
    )
  }
  if (ex.resolution) {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
        {RESOLUTION_LABEL[ex.resolution] ?? ex.resolution}
      </Badge>
    )
  }
  return <Badge variant="outline">Rejected</Badge>
}

export interface ExceptionPanelProps {
  containerId: string
  /** When true, render a permanently expanded panel (used on standalone page). */
  alwaysOpen?: boolean
}

/**
 * Lists all loading exceptions of a container with the inline APPROVE/REJECT
 * affordance for PLANNER+. Pending counter is highlighted so admins see it
 * from across the room.
 */
export function ExceptionPanel({ containerId, alwaysOpen = false }: ExceptionPanelProps) {
  const { data, isLoading, isError } = useContainerExceptions(containerId, { limit: 100 })
  const [expanded, setExpanded] = useState(alwaysOpen)
  const [target, setTarget] = useState<LoadingException | null>(null)

  const exceptions = data?.items ?? []
  const pendingCount = exceptions.filter((ex) => !ex.approved_by).length

  if (isLoading) {
    return (
      <div className="rounded-md border p-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-12 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        Không thể tải danh sách exception.
      </div>
    )
  }

  const showOpen = alwaysOpen || expanded

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => !alwaysOpen && setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${
          alwaysOpen ? 'cursor-default' : 'hover:bg-muted/30'
        }`}
        disabled={alwaysOpen}
        aria-expanded={showOpen}
      >
        <span className="text-sm font-medium">
          Exception ({exceptions.length})
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pendingCount} pending
            </span>
          )}
        </span>
        {!alwaysOpen && (showOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />)}
      </button>

      {showOpen && (
        <div className="border-t">
          {exceptions.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Chưa có exception nào cho container này.
            </p>
          ) : (
            <ul className="divide-y">
              {exceptions.map((ex) => (
                <li key={ex.id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge variant={TYPE_BADGE_VARIANT[ex.exception_type] ?? 'outline'}>
                      {TYPE_LABEL[ex.exception_type] ?? ex.exception_type}
                    </Badge>
                    <ExceptionStatusBadge ex={ex} />
                    {typeof ex.qty === 'number' && ex.qty > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Qty {ex.qty}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(ex.created_at)}
                    </span>
                  </div>

                  <p className="text-sm">{ex.reason}</p>

                  {ex.resolution_notes && (
                    <p className="rounded-sm bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                      Resolution: {ex.resolution_notes}
                    </p>
                  )}

                  {ex.photo_urls && ex.photo_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ex.photo_urls.slice(0, 4).map((url, i) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-xs hover:bg-muted"
                        >
                          <ImageIcon className="size-3" /> Ảnh {i + 1}
                        </a>
                      ))}
                      {ex.photo_urls.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{ex.photo_urls.length - 4} ảnh khác
                        </span>
                      )}
                    </div>
                  )}

                  {!ex.approved_by && (
                    <RoleGate min="PLANNER">
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setTarget(ex)}>
                          Xử lý
                        </Button>
                      </div>
                    </RoleGate>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ApproveExceptionDialog
        exception={target}
        containerId={containerId}
        onCompleted={() => setTarget(null)}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
