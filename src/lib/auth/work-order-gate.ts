import type { WorkOrder } from '@/types/api'

/**
 * Mirrors backend `production/service.go` AdvanceStatus precondition for
 * PLANNED → IN_CUTTING: only the assigned CNC operator can start, with admin
 * bypass. Use to decide whether the FE shows or disables the "Bắt đầu cắt"
 * action so users don't trigger a 412 ErrPreconditionFailed they can't fix.
 *
 * Spec §5.1 — Quy tắc Giao việc; BR-P02.
 */
export type StartCutGate =
  /** Unassigned WO; current role can dispatch it from /cutting-dispatch. */
  | { kind: 'unassigned-dispatchable' }
  /** Unassigned WO; current role can't dispatch — show disabled hint. */
  | { kind: 'unassigned-blocked' }
  /** Assigned to someone else, caller is not admin. */
  | { kind: 'wrong-user' }
  /** Caller may start cutting (assignee match or admin bypass). */
  | { kind: 'allowed' }

const DISPATCH_ROLES = new Set(['admin', 'planner', 'cnc_manager'])

export function evaluateStartCutGate(args: {
  wo: Pick<WorkOrder, 'assigned_to'>
  currentUserId: string | null | undefined
  role: string | null | undefined
}): StartCutGate {
  const { wo, currentUserId, role } = args
  const isAdmin = role === 'admin'

  if (!wo.assigned_to) {
    return DISPATCH_ROLES.has(role ?? '')
      ? { kind: 'unassigned-dispatchable' }
      : { kind: 'unassigned-blocked' }
  }
  if (isAdmin) return { kind: 'allowed' }
  if (currentUserId && wo.assigned_to === currentUserId) return { kind: 'allowed' }
  return { kind: 'wrong-user' }
}

export function startCutTooltip(gate: StartCutGate): string {
  switch (gate.kind) {
    case 'unassigned-blocked':
      return 'Lệnh chưa phân công CNC'
    case 'wrong-user':
      return 'Lệnh chưa được điều phối cho bạn'
    case 'unassigned-dispatchable':
      return 'Lệnh chưa phân công CNC — bấm để điều phối'
    case 'allowed':
      return ''
  }
}
