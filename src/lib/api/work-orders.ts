import type {
  WorkOrder,
  CreateWOInput,
  AdvanceStatusInput,
  AssignWorkOrderInput,
  SuggestAssignmentResult,
  ConsumptionRecord,
  AddConsumptionInput,
  LaborEntry,
  AddLaborEntryInput,
  PartialCompleteInput,
  PartialCompleteResult,
  FeasibilityResult,
  BoostPriorityResult,
  PreemptCandidate,
  PreemptResult,
  QCEvent,
  CursorResult,
} from '@/types/api'
import { apiClient } from './client'

export interface WorkOrdersFilter {
  status?: string
  plan_id?: string
  date?: string
  from?: string
  to?: string
  /**
   * Assignment filter for /cutting-dispatch. Pass `'null'` to fetch only WOs
   * with `assigned_to IS NULL`; omit to include all. Backend may not yet honor
   * this — callers should apply a client-side fallback when defensiveness
   * matters.
   */
  assigned?: 'null' | string
  cursor?: string
  limit?: number
}

export const workOrdersApi = {
  /** GET /api/v1/work-orders */
  list: (filter: WorkOrdersFilter = {}) =>
    apiClient.get<CursorResult<WorkOrder>>('/work-orders', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  /** GET /api/v1/work-orders/:id */
  getById: (id: string) => apiClient.get<WorkOrder>(`/work-orders/${id}`),

  /** POST /api/v1/work-orders */
  create: (input: CreateWOInput) =>
    apiClient.post<WorkOrder>('/work-orders', input),

  /** POST /api/v1/work-orders/:id/advance */
  advance: (id: string, input: AdvanceStatusInput) =>
    apiClient.post<WorkOrder>(`/work-orders/${id}/advance`, input),

  /** GET /api/v1/work-orders/:id/consumptions */
  listConsumptions: (id: string) =>
    apiClient.get<ConsumptionRecord[]>(`/work-orders/${id}/consumptions`),

  /** POST /api/v1/work-orders/:id/consumptions */
  addConsumption: (id: string, input: AddConsumptionInput) =>
    apiClient.post<ConsumptionRecord>(`/work-orders/${id}/consumptions`, input),

  /** GET /api/v1/work-orders/:id/labor-entries */
  listLaborEntries: (id: string) =>
    apiClient.get<LaborEntry[]>(`/work-orders/${id}/labor-entries`),

  /** POST /api/v1/work-orders/:id/labor-entries */
  addLaborEntry: (id: string, input: AddLaborEntryInput) =>
    apiClient.post<LaborEntry>(`/work-orders/${id}/labor-entries`, input),

  /** POST /api/v1/work-orders/:id/assign */
  assign: (id: string, input: AssignWorkOrderInput) =>
    apiClient.post<WorkOrder>(`/work-orders/${id}/assign`, input),

  /** POST /api/v1/work-orders/:id/suggest-assignment */
  suggestAssignment: (id: string) =>
    apiClient.post<SuggestAssignmentResult>(`/work-orders/${id}/suggest-assignment`, {}),

  /**
   * POST /api/v1/work-orders/:id/report — partial-complete (#292).
   * Closes the WO with `actual_qty <= quantity` and optionally spawns a
   * carry-over WO. Source WO must be in IN_PROCESSING.
   */
  partialComplete: (id: string, input: PartialCompleteInput) =>
    apiClient.post<PartialCompleteResult>(`/work-orders/${id}/report`, input),

  /** GET /api/v1/planning/work-orders/:id/check-feasibility */
  checkFeasibility: (id: string) =>
    apiClient.get<FeasibilityResult>(`/planning/work-orders/${id}/check-feasibility`),

  /** POST /api/v1/planning/work-orders/:id/boost-priority */
  boostPriority: (id: string, reason: string) =>
    apiClient.post<BoostPriorityResult>(`/planning/work-orders/${id}/boost-priority`, { reason }),

  /** GET /api/v1/planning/work-orders/:id/preempt-candidates */
  listPreemptCandidates: (id: string) =>
    apiClient.get<PreemptCandidate[]>(`/planning/work-orders/${id}/preempt-candidates`),

  /** POST /api/v1/planning/work-orders/:id/preempt */
  preempt: (id: string, from_wo_id: string, reason: string) =>
    apiClient.post<PreemptResult>(`/planning/work-orders/${id}/preempt`, { from_wo_id, reason }),

  /** GET /api/v1/work-orders/:id/qc-history */
  getQCHistory: (id: string) =>
    apiClient.get<QCEvent[]>(`/work-orders/${id}/qc-history`),
}
