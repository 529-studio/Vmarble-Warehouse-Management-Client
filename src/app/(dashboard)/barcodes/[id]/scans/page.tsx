'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useBarcode, useBarcodeScanEvents } from '@/lib/hooks/use-barcode'
import type { ScanCheckpoint, ScanEvent, BarcodeRecord } from '@/types/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKPOINT_ORDER: ScanCheckpoint[] = ['CNC_COMPLETE', 'FINISHED_GOODS', 'SHIPPED']

const CHECKPOINT_LABEL: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'Hoàn thành CNC',
  FINISHED_GOODS: 'Hoàn thành gia công',
  SHIPPED: 'Xuất kho',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── BarcodeInfoCard ───────────────────────────────────────────────────────────

function BarcodeInfoCard({ barcode }: { barcode: BarcodeRecord }) {
  return (
    <div className="rounded-lg border p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <QrCode className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Barcode ID
          </p>
          <p className="mt-0.5 break-all font-mono text-sm font-semibold">
            {barcode.id}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <InfoField label="SKU" value={barcode.sku_code} />
        <InfoField label="Tên sản phẩm" value={barcode.sku_name} />
        <InfoField label="Kích thước" value={barcode.dimensions} />
        <InfoField
          label="Lệnh sản xuất"
          value={
            <Link
              href={`/work-orders/${barcode.work_order_id}`}
              className="font-mono text-primary hover:underline"
            >
              {shortId(barcode.work_order_id)}
            </Link>
          }
        />
      </div>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

// ── CheckpointTimeline ────────────────────────────────────────────────────────

function CheckpointTimeline({ events }: { events: ScanEvent[] }) {
  // Build a lookup so we can find each checkpoint's event in O(1)
  const byCheckpoint = new Map<ScanCheckpoint, ScanEvent>()
  for (const e of events) {
    byCheckpoint.set(e.checkpoint, e)
  }

  const allPending = events.length === 0

  return (
    <div className="rounded-lg border p-5">
      <h2 className="mb-5 text-base font-semibold">Timeline checkpoint</h2>

      {allPending && (
        <p className="mb-5 rounded-lg border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
          Chưa có điểm kiểm tra nào được quét cho barcode này.
        </p>
      )}

      <ol className="relative space-y-0">
        {CHECKPOINT_ORDER.map((cp, idx) => {
          const event = byCheckpoint.get(cp)
          const done = !!event
          const isLast = idx === CHECKPOINT_ORDER.length - 1

          return (
            <li key={cp} className="relative flex gap-4">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${done ? 'bg-green-400' : 'bg-border'}`}
                />
              )}

              {/* Step icon */}
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                {done ? (
                  <CheckCircle2 className="size-8 text-green-500" />
                ) : (
                  <Circle className="size-8 text-muted-foreground/40" />
                )}
              </div>

              {/* Step content */}
              <div className={`pb-8 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {CHECKPOINT_LABEL[cp]}
                  </span>
                  {done && (
                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 text-xs">
                      Đã quét
                    </Badge>
                  )}
                </div>

                {done && event ? (
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p>{formatDateTime(event.scanned_at)}</p>
                    <p>Quét bởi: <span className="font-medium text-foreground">{event.scanned_by}</span></p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Chưa quét</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ── Page content ──────────────────────────────────────────────────────────────

function ScanTimelinePage({ id }: { id: string }) {
  const { data: barcode, isLoading: barcodeLoading, isError: barcodeError } = useBarcode(id)
  const { data: events, isLoading: eventsLoading, isError: eventsError } = useBarcodeScanEvents(id)

  if (barcodeLoading || eventsLoading) {
    return (
      <div className="space-y-4">
        {/* Barcode info card skeleton */}
        <div className="rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
        {/* Timeline skeleton */}
        <div className="rounded-lg border p-5">
          <Skeleton className="mb-5 h-5 w-36" />
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="space-y-1.5 pt-0.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (barcodeError || !barcode) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-destructive">
        Không thể tải thông tin barcode. Barcode có thể không tồn tại.
      </p>
    )
  }

  if (eventsError) {
    return (
      <p className="rounded-lg border p-6 text-center text-sm text-destructive">
        Không thể tải lịch sử quét.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <BarcodeInfoCard barcode={barcode} />
      <CheckpointTimeline events={events ?? []} />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function BarcodeScanHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work-orders">
            <ArrowLeft className="size-4" />
            Lệnh sản xuất
          </Link>
        </Button>
        <QrCode className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Lịch sử quét barcode</h1>
      </div>

      <ScanTimelinePage id={id} />
    </div>
  )
}
