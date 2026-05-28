import { describe, expect, it } from 'vitest'
import type { ContainerLine, LoadingException, LoadingPlanLine } from '@/types/api'
import { computeSealBlockers, reconcile } from './reconciliation'

function plan(
  customer_sku_code: string,
  qty: number,
  sku_id?: string,
  i = 0,
): LoadingPlanLine {
  return {
    id: `plan-${customer_sku_code}-${i}`,
    loading_plan_id: 'plan-1',
    excel_row_num: i + 2,
    customer_sku_code,
    sku_id,
    qty_in_excel: qty,
    unit_in_excel: 'pcs',
    qty_planned_pieces: qty,
    created_at: '2026-05-28T00:00:00Z',
  }
}

function line(
  sku_code: string,
  qty: number,
  sku_id = `sku-${sku_code}`,
  i = 0,
): ContainerLine {
  return {
    id: `cl-${sku_code}-${i}`,
    container_id: 'c1',
    sales_order_line_id: `sl-${i}`,
    sku_id,
    sku_code,
    sku_name: `Name ${sku_code}`,
    qty,
    cbm_total: 0,
    weight_kg_total: 0,
    added_by: 'user-1',
    added_at: '2026-05-28T01:00:00Z',
  }
}

describe('reconcile', () => {
  it('marks lines MATCH when actual equals planned', () => {
    const r = reconcile(
      [plan('TBL-WAL-120', 30, 'sku-A', 0)],
      [line('TBL-WAL-120', 30, 'sku-A', 0)],
    )
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].status).toBe('MATCH')
    expect(r.rows[0].delta).toBe(0)
    expect(r.summary.rows_match).toBe(1)
    expect(r.summary.units_missing).toBe(0)
    expect(r.summary.units_over).toBe(0)
  })

  it('marks SHORT and OVER and computes deltas', () => {
    const r = reconcile(
      [
        plan('SKU-A', 20, 'a', 0),
        plan('SKU-B', 15, 'b', 1),
      ],
      [
        line('SKU-A', 18, 'a', 0),
        line('SKU-B', 17, 'b', 1),
      ],
    )
    const a = r.rows.find((x) => x.sku_id === 'a')!
    const b = r.rows.find((x) => x.sku_id === 'b')!
    expect(a.status).toBe('SHORT')
    expect(a.delta).toBe(-2)
    expect(b.status).toBe('OVER')
    expect(b.delta).toBe(2)
    expect(r.summary.units_missing).toBe(2)
    expect(r.summary.units_over).toBe(2)
  })

  it('marks MISSING when planned > 0 and actual = 0', () => {
    const r = reconcile([plan('SKU-A', 10, 'a', 0)], [])
    expect(r.rows[0].status).toBe('MISSING')
    expect(r.rows[0].qty_actual).toBe(0)
    expect(r.summary.units_missing).toBe(10)
    expect(r.summary.rows_missing).toBe(1)
  })

  it('marks UNPLANNED when actual exists with no plan row', () => {
    const r = reconcile([], [line('SKU-X', 5, 'x', 0)])
    expect(r.rows[0].status).toBe('UNPLANNED')
    expect(r.rows[0].qty_planned).toBe(0)
    expect(r.summary.rows_unplanned).toBe(1)
  })

  it('matches via sku_id even when customer_sku_code differs', () => {
    const r = reconcile(
      [plan('CUSTOM-CODE', 10, 'sku-1', 0)],
      [line('SKU-0042', 10, 'sku-1', 0)],
    )
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].status).toBe('MATCH')
  })

  it('falls back to customer_sku_code when plan has no sku_id', () => {
    const r = reconcile(
      [plan('TBL-WAL-120', 5, undefined, 0)],
      [line('TBL-WAL-120', 5, 'sku-1', 0)],
    )
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].status).toBe('MATCH')
  })

  it('aggregates duplicate plan rows by sku_id', () => {
    const r = reconcile(
      [
        plan('SKU-A', 10, 'a', 0),
        plan('SKU-A', 5, 'a', 1),
      ],
      [line('SKU-A', 15, 'a', 0)],
    )
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].qty_planned).toBe(15)
    expect(r.rows[0].status).toBe('MATCH')
  })

  it('orders rows: OVER → SHORT → MISSING → UNPLANNED → MATCH', () => {
    const r = reconcile(
      [
        plan('A', 10, 'a', 0),
        plan('B', 10, 'b', 1),
        plan('C', 10, 'c', 2),
        plan('D', 10, 'd', 3),
      ],
      [
        line('A', 10, 'a', 0),
        line('B', 7, 'b', 1),
        line('C', 13, 'c', 2),
        line('Z', 5, 'z', 3),
      ],
    )
    expect(r.rows.map((x) => x.status)).toEqual([
      'OVER',
      'SHORT',
      'MISSING',
      'UNPLANNED',
      'MATCH',
    ])
  })
})

describe('computeSealBlockers', () => {
  const baseException = {
    container_id: 'c1',
    reason: 'r',
    created_at: '2026-05-28T00:00:00Z',
    created_by: 'u1',
  } satisfies Omit<
    LoadingException,
    'id' | 'exception_type' | 'approved_by' | 'resolution' | 'sku_id'
  >

  it('returns no blockers on a clean MATCH plan', () => {
    const r = reconcile([plan('A', 10, 'a', 0)], [line('A', 10, 'a', 0)])
    expect(computeSealBlockers(r, [])).toEqual([])
  })

  it('flags pending exceptions', () => {
    const r = reconcile([plan('A', 10, 'a', 0)], [line('A', 10, 'a', 0)])
    const blockers = computeSealBlockers(r, [
      {
        ...baseException,
        id: 'ex-1',
        exception_type: 'SHORT_SHIPPED',
        approved_by: null,
        resolution: null,
        sku_id: 'a',
      },
    ])
    expect(blockers).toHaveLength(1)
    expect(blockers[0]).toMatchObject({
      kind: 'EXCEPTION_PENDING',
      exception_id: 'ex-1',
      exception_type: 'SHORT_SHIPPED',
    })
  })

  it('flags OVER rows without an approved OVER_LOADED exception', () => {
    const r = reconcile([plan('A', 10, 'a', 0)], [line('A', 12, 'a', 0)])
    const blockers = computeSealBlockers(r, [])
    expect(blockers).toEqual([
      { kind: 'OVER_UNRESOLVED', sku_code: 'A', delta: 2 },
    ])
  })

  it('clears OVER row when matching OVER_LOADED is approved', () => {
    const r = reconcile([plan('A', 10, 'a', 0)], [line('A', 12, 'a', 0)])
    const blockers = computeSealBlockers(r, [
      {
        ...baseException,
        id: 'ex-1',
        exception_type: 'OVER_LOADED',
        approved_by: 'u-admin',
        approved_at: '2026-05-28T02:00:00Z',
        resolution: 'WRITE_OFF',
        sku_id: 'a',
      },
    ])
    expect(blockers).toEqual([])
  })

  it('does not clear OVER row when the approved exception is for a different SKU', () => {
    const r = reconcile([plan('A', 10, 'a', 0)], [line('A', 12, 'a', 0)])
    const blockers = computeSealBlockers(r, [
      {
        ...baseException,
        id: 'ex-1',
        exception_type: 'OVER_LOADED',
        approved_by: 'u-admin',
        approved_at: '2026-05-28T02:00:00Z',
        resolution: 'WRITE_OFF',
        sku_id: 'other-sku',
      },
    ])
    expect(blockers).toEqual([
      { kind: 'OVER_UNRESOLVED', sku_code: 'A', delta: 2 },
    ])
  })
})
