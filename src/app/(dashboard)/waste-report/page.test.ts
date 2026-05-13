import { describe, it, expect } from 'vitest'
import { filterCostedRows } from './page'
import type { WasteReportRow } from '@/types/api'

function row(overrides: Partial<WasteReportRow> = {}): WasteReportRow {
  return {
    material_id: 'm1',
    material_name: 'Plywood A',
    sheets_consumed: 10,
    waste_area_mm2: 500_000,
    avg_sheet_cost: { amount: 100_000, currency: 'VND' },
    total_waste_cost: { amount: 50_000, currency: 'VND' },
    ...overrides,
  }
}

describe('filterCostedRows', () => {
  it('keeps rows with a positive total_waste_cost', () => {
    const rows = [row({ material_id: 'a' }), row({ material_id: 'b', total_waste_cost: { amount: 1, currency: 'VND' } })]
    expect(filterCostedRows(rows)).toHaveLength(2)
  })

  it('drops rows whose total_waste_cost is zero (WO chưa costed)', () => {
    const rows = [
      row({ material_id: 'a' }),
      row({ material_id: 'b', total_waste_cost: { amount: 0, currency: 'VND' } }),
      row({ material_id: 'c', total_waste_cost: { amount: 7_000, currency: 'VND' } }),
    ]
    const out = filterCostedRows(rows)
    expect(out.map((r) => r.material_id)).toEqual(['a', 'c'])
  })

  it('drops rows with negative cost defensively (should never happen in practice)', () => {
    const rows = [row({ material_id: 'a', total_waste_cost: { amount: -1, currency: 'VND' } })]
    expect(filterCostedRows(rows)).toHaveLength(0)
  })

  it('returns an empty array when every row is uncosted', () => {
    const rows = [
      row({ material_id: 'a', total_waste_cost: { amount: 0, currency: 'VND' } }),
      row({ material_id: 'b', total_waste_cost: { amount: 0, currency: 'VND' } }),
    ]
    expect(filterCostedRows(rows)).toEqual([])
  })
})
