// Shared number / money / date formatters. Keep presentational-only — no API or state here.

/**
 * Format a raw VND amount (smallest-unit integer from the backend) as a
 * locale-aware Vietnamese currency string, e.g. `1.500.000 ₫`.
 *
 * Always rounds to whole đồng (we never display sub-đồng precision) and uses
 * `vi-VN` thousand separators.
 */
export function formatVND(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  return Math.round(amount).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  })
}

/**
 * Format a `{ amount, currency }` Money DTO. Falls back to `amount + currency`
 * when the currency is non-VND so display stays predictable.
 */
export function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return '—'
  if (currency === 'VND') return formatVND(amount)
  try {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency })
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`
  }
}

/**
 * Format a plain integer quantity with vi-VN thousand separators
 * (e.g. 1500 → `1.500`). For counts of sheets, pieces, etc.
 */
export function formatIntVN(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('vi-VN')
}
