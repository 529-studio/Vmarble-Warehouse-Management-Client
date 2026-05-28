'use client'

import { CheckCircle2, AlertTriangle, AlertCircle, Plus, MinusCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type {
  Reconciliation,
  ReconciliationRow,
  ReconciliationStatus,
} from '@/lib/delivery/reconciliation'

const STATUS_LABEL: Record<ReconciliationStatus, string> = {
  MATCH: 'Khớp',
  SHORT: 'Thiếu',
  OVER: 'Dư',
  MISSING: 'Chưa có',
  UNPLANNED: 'Ngoài plan',
}

const ROW_BG: Record<ReconciliationStatus, string> = {
  MATCH: '',
  SHORT: 'bg-amber-50',
  OVER: 'bg-rose-50',
  MISSING: 'bg-slate-50',
  UNPLANNED: 'bg-rose-50',
}

const BADGE_VARIANT: Record<
  ReconciliationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  MATCH: 'secondary',
  SHORT: 'outline',
  OVER: 'destructive',
  MISSING: 'outline',
  UNPLANNED: 'destructive',
}

function StatusIcon({ status }: { status: ReconciliationStatus }) {
  const cls = 'size-3.5'
  switch (status) {
    case 'MATCH':
      return <CheckCircle2 className={`${cls} text-emerald-600`} aria-hidden />
    case 'SHORT':
      return <MinusCircle className={`${cls} text-amber-600`} aria-hidden />
    case 'OVER':
      return <Plus className={`${cls} text-rose-600`} aria-hidden />
    case 'MISSING':
      return <AlertCircle className={`${cls} text-slate-500`} aria-hidden />
    case 'UNPLANNED':
      return <AlertTriangle className={`${cls} text-rose-600`} aria-hidden />
  }
}

function formatDelta(d: number): string {
  if (d === 0) return '0'
  return d > 0 ? `+${d}` : `${d}`
}

export interface ReconciliationMatrixProps {
  reconciliation: Reconciliation
  /** Truncate body to first N rows; falsey = render all. */
  limit?: number
}

export function ReconciliationMatrix({
  reconciliation,
  limit,
}: ReconciliationMatrixProps) {
  const rows: ReconciliationRow[] = limit
    ? reconciliation.rows.slice(0, limit)
    : reconciliation.rows
  const truncated = limit ? reconciliation.rows.length - rows.length : 0

  if (reconciliation.rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Chưa có dòng nào — upload packing-list Excel để bắt đầu reconciliation.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã khách</TableHead>
            <TableHead>Mã DB</TableHead>
            <TableHead>Tên</TableHead>
            <TableHead className="text-right">Plan</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Δ</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} className={ROW_BG[row.status]}>
              <TableCell className="font-mono text-xs">
                {row.customer_sku_code ?? '—'}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.sku_code !== row.customer_sku_code ? row.sku_code : '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground line-clamp-1">
                {row.sku_name ?? '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.qty_planned}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.qty_actual}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${
                  row.delta < 0
                    ? 'text-amber-700'
                    : row.delta > 0
                    ? 'text-rose-700'
                    : 'text-muted-foreground'
                }`}
              >
                {formatDelta(row.delta)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={BADGE_VARIANT[row.status]}
                  className="gap-1 font-normal"
                >
                  <StatusIcon status={row.status} />
                  {STATUS_LABEL[row.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {truncated > 0 && (
        <div className="border-t bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground">
          Còn {truncated} dòng khác — xem trang reconciliation đầy đủ.
        </div>
      )}
    </div>
  )
}

export interface ReconciliationCounterProps {
  summary: Reconciliation['summary']
}

/** "92/100 đơn vị (thiếu 8, dư 0)" — header counter per spec. */
export function ReconciliationCounter({ summary }: ReconciliationCounterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-mono text-base font-semibold tabular-nums">
        {summary.total_actual}/{summary.total_planned}
      </span>
      <span className="text-muted-foreground">đơn vị</span>
      {(summary.units_missing > 0 || summary.units_over > 0) && (
        <span className="text-muted-foreground">
          (
          {summary.units_missing > 0 && (
            <span className="text-amber-700">
              thiếu {summary.units_missing}
            </span>
          )}
          {summary.units_missing > 0 && summary.units_over > 0 && ', '}
          {summary.units_over > 0 && (
            <span className="text-rose-700">dư {summary.units_over}</span>
          )}
          )
        </span>
      )}
    </div>
  )
}
