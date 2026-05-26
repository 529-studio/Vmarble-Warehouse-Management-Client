import { describe, expect, it } from 'vitest'
import { isAtLeast, personaOf } from './persona'

describe('personaOf', () => {
  it('maps admin role to ADMIN persona', () => {
    expect(personaOf('admin')).toBe('ADMIN')
  })

  it('maps planner and accountant to PLANNER persona', () => {
    expect(personaOf('planner')).toBe('PLANNER')
    expect(personaOf('accountant')).toBe('PLANNER')
  })

  it('maps shop-floor roles to WORKER persona', () => {
    expect(personaOf('warehouse')).toBe('WORKER')
    expect(personaOf('cnc')).toBe('WORKER')
    expect(personaOf('cnc_manager')).toBe('WORKER')
    expect(personaOf('foreman')).toBe('WORKER')
  })

  it('returns null for unknown / missing roles', () => {
    expect(personaOf('marketing')).toBeNull()
    expect(personaOf('')).toBeNull()
    expect(personaOf(null)).toBeNull()
    expect(personaOf(undefined)).toBeNull()
  })
})

describe('isAtLeast', () => {
  it('respects WORKER < PLANNER < ADMIN ordering', () => {
    expect(isAtLeast('ADMIN', 'WORKER')).toBe(true)
    expect(isAtLeast('PLANNER', 'WORKER')).toBe(true)
    expect(isAtLeast('WORKER', 'WORKER')).toBe(true)

    expect(isAtLeast('PLANNER', 'PLANNER')).toBe(true)
    expect(isAtLeast('ADMIN', 'PLANNER')).toBe(true)
    expect(isAtLeast('WORKER', 'PLANNER')).toBe(false)

    expect(isAtLeast('ADMIN', 'ADMIN')).toBe(true)
    expect(isAtLeast('PLANNER', 'ADMIN')).toBe(false)
    expect(isAtLeast('WORKER', 'ADMIN')).toBe(false)
  })

  it('returns false when persona is null', () => {
    expect(isAtLeast(null, 'WORKER')).toBe(false)
  })
})
