/**
 * Realtime SSE event types — mirror BE `internal/platform/events`.
 *
 * Source of truth: `events.go` constants (BE PR #266 / issue #258).
 * The FE never writes events, only consumes them; routing fields (`user_id`,
 * `roles`) are informational — the BE has already filtered by them before the
 * frame reaches us.
 */

export type RealtimeEventType =
  | 'NEW_ASSIGNMENT'
  | 'WO_STATUS_CHANGED'
  | 'CUTTING_RECORDED'
  | 'SCAN_CHECKPOINT'
  | 'COSTING_COMPUTED'

export interface RealtimeEvent {
  /** Personal target — present on NEW_ASSIGNMENT, blank otherwise. */
  user_id?: string
  /** Role audience the BE fanned the event out to. */
  roles?: string[]
  type: RealtimeEventType | string
  /** Anchored work order — present on most events, blank for global broadcasts. */
  wo_id?: string
  /** SKU code shipped on NEW_ASSIGNMENT so toast can show it without a fetch. */
  sku?: string
  payload?: Record<string, unknown>
}

export function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== 'object') return false
  const t = (value as Record<string, unknown>).type
  return typeof t === 'string'
}
