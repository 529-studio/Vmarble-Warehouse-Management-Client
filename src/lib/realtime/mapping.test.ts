import { describe, it, expect } from 'vitest'
import { eventToQueryKeys } from './mapping'
import type { RealtimeEvent } from './events'

function ev(type: RealtimeEvent['type'], extra: Partial<RealtimeEvent> = {}): RealtimeEvent {
  return { type, ...extra }
}

describe('eventToQueryKeys', () => {
  it('maps NEW_ASSIGNMENT to work-orders + cutting-orders prefixes', () => {
    const keys = eventToQueryKeys(ev('NEW_ASSIGNMENT'))
    expect(keys).toEqual([['work-orders'], ['cutting-orders']])
  })

  it('maps WO_STATUS_CHANGED to lists + WIP pipeline + dashboard', () => {
    const keys = eventToQueryKeys(ev('WO_STATUS_CHANGED', { wo_id: 'abc' }))
    expect(keys).toEqual([
      ['work-orders'],
      ['cutting-orders'],
      ['dashboard-overview'],
      ['dashboard-wip-pipeline'],
    ])
  })

  it('maps CUTTING_RECORDED to inventory + remnants + dashboard', () => {
    const keys = eventToQueryKeys(ev('CUTTING_RECORDED'))
    expect(keys).toEqual([
      ['work-orders'],
      ['inventory-overflow-status'],
      ['inventory-sheets'],
      ['remnants'],
      ['dashboard-overview'],
    ])
  })

  it('maps SCAN_CHECKPOINT to barcodes + scan-events + WO + dashboard', () => {
    const keys = eventToQueryKeys(ev('SCAN_CHECKPOINT'))
    expect(keys).toEqual([
      ['barcodes'],
      ['scan-events'],
      ['work-orders'],
      ['dashboard-overview'],
    ])
  })

  it('maps COSTING_COMPUTED to the costing prefix only', () => {
    const keys = eventToQueryKeys(ev('COSTING_COMPUTED'))
    expect(keys).toEqual([['costing']])
  })

  it('maps CONTAINER_STATUS_CHANGED to the containers prefix only', () => {
    const keys = eventToQueryKeys(ev('CONTAINER_STATUS_CHANGED'))
    expect(keys).toEqual([['containers']])
  })

  it('returns [] for an unknown type — tolerated for forward compatibility', () => {
    const keys = eventToQueryKeys(ev('SOMETHING_NEW' as RealtimeEvent['type']))
    expect(keys).toEqual([])
  })

  it('every returned key is a non-empty array prefix', () => {
    const types: RealtimeEvent['type'][] = [
      'NEW_ASSIGNMENT',
      'WO_STATUS_CHANGED',
      'CUTTING_RECORDED',
      'SCAN_CHECKPOINT',
      'COSTING_COMPUTED',
      'CONTAINER_STATUS_CHANGED',
    ]
    for (const t of types) {
      for (const key of eventToQueryKeys(ev(t))) {
        expect(Array.isArray(key)).toBe(true)
        expect(key.length).toBeGreaterThan(0)
      }
    }
  })
})
