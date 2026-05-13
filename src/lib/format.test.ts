import { describe, it, expect } from 'vitest'
import { formatVND, formatMoney, formatIntVN } from './format'

describe('formatVND', () => {
  it('adds vi-VN thousand separators and the đồng symbol', () => {
    // Non-breaking space (U+00A0) sits between number and symbol on some runtimes.
    const out = formatVND(1_500_000)
    expect(out.replace(/\s+/g, ' ')).toBe('1.500.000 ₫')
  })

  it('rounds fractional đồng to the nearest whole', () => {
    expect(formatVND(1_500.4)).toMatch(/^1\.500/)
    expect(formatVND(1_500.6)).toMatch(/^1\.501/)
  })

  it('handles zero and negative amounts', () => {
    expect(formatVND(0)).toMatch(/^0\s*₫$/)
    expect(formatVND(-50_000)).toMatch(/^-50\.000/)
  })

  it('returns em-dash for NaN / Infinity instead of throwing', () => {
    expect(formatVND(Number.NaN)).toBe('—')
    expect(formatVND(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('formatMoney', () => {
  it('delegates to formatVND when currency is VND', () => {
    expect(formatMoney(1_000_000, 'VND')).toBe(formatVND(1_000_000))
  })

  it('formats non-VND currencies using vi-VN locale', () => {
    const out = formatMoney(1234.56, 'USD')
    expect(out).toMatch(/1\.234/)
    expect(out).toMatch(/US/)
  })

  it('falls back to raw-number + currency on unknown codes', () => {
    const out = formatMoney(10, 'ZZZ')
    expect(out).toMatch(/10/)
    expect(out).toMatch(/ZZZ/)
  })
})

describe('formatIntVN', () => {
  it('separates thousands with periods', () => {
    expect(formatIntVN(1_000)).toBe('1.000')
    expect(formatIntVN(1_234_567)).toBe('1.234.567')
  })
})
