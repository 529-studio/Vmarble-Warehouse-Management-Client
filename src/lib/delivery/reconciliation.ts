import type {
  ContainerLine,
  LoadingException,
  LoadingPlanLine,
} from '@/types/api'

/**
 * Reconciliation status for a single SKU row in a container.
 *
 *   MATCH     — actual === planned (Δ = 0)
 *   SHORT     — actual < planned (Δ < 0)
 *   OVER      — actual > planned (Δ > 0)
 *   MISSING   — line exists in plan but no actual line was added yet
 *   UNPLANNED — line was added to the container but is not in the plan
 */
export type ReconciliationStatus =
  | 'MATCH'
  | 'SHORT'
  | 'OVER'
  | 'MISSING'
  | 'UNPLANNED'

export interface ReconciliationRow {
  /** Composite identity — `sku_id` if known, otherwise `code:<customer_sku_code>`. */
  key: string
  sku_id?: string
  sku_code: string
  customer_sku_code?: string
  sku_name?: string
  qty_planned: number
  qty_actual: number
  delta: number
  status: ReconciliationStatus
}

export interface ReconciliationSummary {
  total_planned: number
  total_actual: number
  units_missing: number
  units_over: number
  rows_match: number
  rows_short: number
  rows_over: number
  rows_missing: number
  rows_unplanned: number
}

export interface Reconciliation {
  rows: ReconciliationRow[]
  summary: ReconciliationSummary
}

function statusFor(planned: number, actual: number): ReconciliationStatus {
  if (planned === 0 && actual > 0) return 'UNPLANNED'
  if (planned > 0 && actual === 0) return 'MISSING'
  const delta = actual - planned
  if (delta === 0) return 'MATCH'
  return delta > 0 ? 'OVER' : 'SHORT'
}

interface Bucket {
  key: string
  sku_id?: string
  customer_sku_code?: string
  sku_code: string
  sku_name?: string
  qty_planned: number
  qty_actual: number
  /** Insertion order — used as a stable tiebreaker. */
  seq: number
}

/**
 * Build the per-SKU reconciliation between an APPROVED loading plan and the
 * actually-loaded `container.lines`. Pure function — no React, no fetching.
 *
 * Identity strategy:
 *   1. Prefer `sku_id` when both sides expose it.
 *   2. Fall back to `customer_sku_code` for plan rows whose SKU has not been
 *      mapped yet (BE leaves `sku_id` empty for unmapped Excel rows).
 *
 * Sort order: OVER → SHORT → MISSING → UNPLANNED → MATCH. Inside a group,
 * preserve plan-row order (then container-line order for UNPLANNED).
 */
export function reconcile(
  planLines: LoadingPlanLine[],
  containerLines: ContainerLine[],
): Reconciliation {
  const buckets = new Map<string, Bucket>()

  planLines.forEach((p, i) => {
    const key = p.sku_id || `code:${p.customer_sku_code}`
    const existing = buckets.get(key)
    if (existing) {
      existing.qty_planned += p.qty_planned_pieces ?? 0
      return
    }
    buckets.set(key, {
      key,
      sku_id: p.sku_id || undefined,
      customer_sku_code: p.customer_sku_code,
      sku_code: p.customer_sku_code || p.sku_id || '—',
      qty_planned: p.qty_planned_pieces ?? 0,
      qty_actual: 0,
      seq: i,
    })
  })

  containerLines.forEach((cl, i) => {
    const byId = cl.sku_id ? buckets.get(cl.sku_id) : undefined
    const target = byId ?? findByCode(buckets, cl.sku_code)
    if (target) {
      target.qty_actual += cl.qty
      target.sku_code = target.sku_code === '—' ? cl.sku_code : target.sku_code
      target.sku_name = target.sku_name ?? cl.sku_name
      return
    }
    const key = cl.sku_id || `code:${cl.sku_code}`
    buckets.set(key, {
      key,
      sku_id: cl.sku_id,
      sku_code: cl.sku_code,
      sku_name: cl.sku_name,
      qty_planned: 0,
      qty_actual: cl.qty,
      seq: planLines.length + i,
    })
  })

  const rows: ReconciliationRow[] = Array.from(buckets.values()).map((b) => ({
    key: b.key,
    sku_id: b.sku_id,
    sku_code: b.sku_code,
    customer_sku_code: b.customer_sku_code,
    sku_name: b.sku_name,
    qty_planned: b.qty_planned,
    qty_actual: b.qty_actual,
    delta: b.qty_actual - b.qty_planned,
    status: statusFor(b.qty_planned, b.qty_actual),
  }))

  const groupRank: Record<ReconciliationStatus, number> = {
    OVER: 0,
    SHORT: 1,
    MISSING: 2,
    UNPLANNED: 3,
    MATCH: 4,
  }
  const seqByKey = new Map<string, number>()
  for (const b of buckets.values()) seqByKey.set(b.key, b.seq)
  rows.sort((a, b) => {
    const r = groupRank[a.status] - groupRank[b.status]
    if (r !== 0) return r
    return (seqByKey.get(a.key) ?? 0) - (seqByKey.get(b.key) ?? 0)
  })

  let total_planned = 0
  let total_actual = 0
  let units_missing = 0
  let units_over = 0
  let rows_match = 0
  let rows_short = 0
  let rows_over = 0
  let rows_missing = 0
  let rows_unplanned = 0
  for (const r of rows) {
    total_planned += r.qty_planned
    total_actual += r.qty_actual
    if (r.delta < 0) units_missing += -r.delta
    if (r.delta > 0) units_over += r.delta
    switch (r.status) {
      case 'MATCH':
        rows_match++
        break
      case 'SHORT':
        rows_short++
        break
      case 'OVER':
        rows_over++
        break
      case 'MISSING':
        rows_missing++
        break
      case 'UNPLANNED':
        rows_unplanned++
        break
    }
  }

  return {
    rows,
    summary: {
      total_planned,
      total_actual,
      units_missing,
      units_over,
      rows_match,
      rows_short,
      rows_over,
      rows_missing,
      rows_unplanned,
    },
  }
}

function findByCode(buckets: Map<string, Bucket>, skuCode: string): Bucket | undefined {
  for (const b of buckets.values()) {
    if (b.sku_code === skuCode || b.customer_sku_code === skuCode) return b
  }
  return undefined
}

// ── SEAL blockers ────────────────────────────────────────────────────────────

export type SealBlocker =
  | { kind: 'OVER_UNRESOLVED'; sku_code: string; delta: number }
  | { kind: 'EXCEPTION_PENDING'; exception_id: string; exception_type: string }

/**
 * Seal is allowed when:
 *   - No row has status OVER without an APPROVED OVER_LOADED exception
 *     covering the same SKU.
 *   - No exception is pending (`approved_by` NULL).
 *
 * Returns blockers in stable order: pending exceptions first (table order),
 * then OVER rows. An empty list means SEAL can proceed.
 */
export function computeSealBlockers(
  reconciliation: Reconciliation,
  exceptions: LoadingException[],
): SealBlocker[] {
  const blockers: SealBlocker[] = []

  for (const ex of exceptions) {
    if (!ex.approved_by) {
      blockers.push({
        kind: 'EXCEPTION_PENDING',
        exception_id: ex.id,
        exception_type: ex.exception_type,
      })
    }
  }

  const approvedOversBySku = new Set<string>()
  for (const ex of exceptions) {
    if (
      ex.approved_by &&
      ex.exception_type === 'OVER_LOADED' &&
      ex.resolution &&
      ex.sku_id
    ) {
      approvedOversBySku.add(ex.sku_id)
    }
  }
  for (const row of reconciliation.rows) {
    if (row.status !== 'OVER') continue
    if (row.sku_id && approvedOversBySku.has(row.sku_id)) continue
    blockers.push({
      kind: 'OVER_UNRESOLVED',
      sku_code: row.sku_code,
      delta: row.delta,
    })
  }

  return blockers
}
