import { describe, it, expect } from 'vitest'
import { evaluateStartCutGate, startCutTooltip } from './work-order-gate'

describe('evaluateStartCutGate', () => {
  it('returns unassigned-dispatchable for cnc_manager when WO has no assignee', () => {
    const gate = evaluateStartCutGate({
      wo: { assigned_to: null },
      currentUserId: 'u-1',
      role: 'cnc_manager',
    })
    expect(gate.kind).toBe('unassigned-dispatchable')
  })

  it('returns unassigned-dispatchable for planner and admin too', () => {
    expect(evaluateStartCutGate({ wo: { assigned_to: null }, currentUserId: 'u', role: 'planner' }).kind).toBe(
      'unassigned-dispatchable',
    )
    expect(evaluateStartCutGate({ wo: { assigned_to: null }, currentUserId: 'u', role: 'admin' }).kind).toBe(
      'unassigned-dispatchable',
    )
  })

  it('returns unassigned-blocked for foreman/cnc when WO has no assignee', () => {
    expect(evaluateStartCutGate({ wo: { assigned_to: null }, currentUserId: 'u', role: 'foreman' }).kind).toBe(
      'unassigned-blocked',
    )
    expect(evaluateStartCutGate({ wo: { assigned_to: null }, currentUserId: 'u', role: 'cnc' }).kind).toBe(
      'unassigned-blocked',
    )
  })

  it('returns allowed when caller matches assigned_to', () => {
    const gate = evaluateStartCutGate({
      wo: { assigned_to: 'op-42' },
      currentUserId: 'op-42',
      role: 'cnc',
    })
    expect(gate.kind).toBe('allowed')
  })

  it('returns wrong-user when caller is not assignee and not admin', () => {
    const gate = evaluateStartCutGate({
      wo: { assigned_to: 'op-42' },
      currentUserId: 'op-99',
      role: 'foreman',
    })
    expect(gate.kind).toBe('wrong-user')
  })

  it('returns allowed for admin even when not assigned to them', () => {
    const gate = evaluateStartCutGate({
      wo: { assigned_to: 'op-42' },
      currentUserId: 'admin-1',
      role: 'admin',
    })
    expect(gate.kind).toBe('allowed')
  })

  it('treats undefined currentUserId as wrong-user when WO is assigned', () => {
    const gate = evaluateStartCutGate({
      wo: { assigned_to: 'op-42' },
      currentUserId: null,
      role: 'cnc',
    })
    expect(gate.kind).toBe('wrong-user')
  })
})

describe('startCutTooltip', () => {
  it('maps each gate to the expected Vietnamese hint', () => {
    expect(startCutTooltip({ kind: 'unassigned-blocked' })).toBe('Lệnh chưa phân công CNC')
    expect(startCutTooltip({ kind: 'wrong-user' })).toBe('Lệnh chưa được điều phối cho bạn')
    expect(startCutTooltip({ kind: 'unassigned-dispatchable' })).toMatch(/điều phối/i)
    expect(startCutTooltip({ kind: 'allowed' })).toBe('')
  })
})
