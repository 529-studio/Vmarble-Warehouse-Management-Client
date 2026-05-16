/**
 * Pure mapping from a realtime event to the TanStack Query keys that should
 * be invalidated. Kept side-effect-free so it's trivially unit-testable.
 *
 * Each key is a non-empty array — passed to `queryClient.invalidateQueries`
 * which then matches every query whose key starts with that prefix. Returning
 * the bare prefix (e.g. `['work-orders']`) is intentional: a single event
 * should refresh every filter combination of that domain that the user has
 * open in any tab.
 */

import type { RealtimeEvent } from './events'

export type QueryKey = readonly unknown[]

export function eventToQueryKeys(event: RealtimeEvent): QueryKey[] {
  switch (event.type) {
    case 'NEW_ASSIGNMENT':
      // Assignee + cnc_manager dashboards both surface unassigned WO lists.
      return [['work-orders'], ['cutting-orders']]

    case 'WO_STATUS_CHANGED':
      // Status change touches lists, the WO detail card, and the WIP pipeline
      // counts on /overview.
      return [
        ['work-orders'],
        ['cutting-orders'],
        ['dashboard-overview'],
        ['dashboard-wip-pipeline'],
      ]

    case 'CUTTING_RECORDED':
      // RecordCut writes a sheet/remnant + cutting record; refresh inventory
      // overflow gauge and the dashboard counters.
      return [
        ['work-orders'],
        ['inventory-overflow-status'],
        ['inventory-sheets'],
        ['remnants'],
        ['dashboard-overview'],
      ]

    case 'SCAN_CHECKPOINT':
      // A scan advances the WO checkpoint; barcode list latest-scan column +
      // dashboard counters need to reflect it.
      return [
        ['barcodes'],
        ['scan-events'],
        ['work-orders'],
        ['dashboard-overview'],
      ]

    case 'COSTING_COMPUTED':
      // ComputeCost persists a record; costing list + by-WO detail need the
      // new totals. The detail panel keys off `[COSTING_KEY, 'detail', woId]`
      // — invalidating the prefix sweeps both shapes.
      return [['costing']]

    default:
      // Unknown event types are tolerated — the BE may add new types ahead of
      // FE handling. Returning `[]` no-ops the invalidation step.
      return []
  }
}
