import type { Persona } from '@/lib/auth/persona'
import type { ContainerStatus } from '@/types/api'

export type LifecycleAction = 'seal' | 'ship' | 'reopen' | 'cancel'

export interface TransitionPlan {
  action: LifecycleAction
  /** True when BE rejects a blank reason (BR-D06 — reopen). */
  requireReason: boolean
  /** Minimum persona required to drive this transition (FE pre-flight gate). */
  minPersona: Persona
  /** Endpoint suffix ("seal" / "ship" / "reopen" / "cancel"). */
  endpoint: LifecycleAction
}

/**
 * Map (from → to) status pairs to the lifecycle endpoint that drives it.
 * The ContainerStore.UpdateStatus state machine on BE only accepts these
 * transitions; anything else is rejected with 409 ErrInvalidTransition.
 *
 *   OPEN/LOADING ──seal──→ SEALED       (PLANNER+)
 *   SEALED       ──ship──→ SHIPPED      (PLANNER+)
 *   SEALED       ──reopen→ LOADING      (ADMIN, reason required)
 *   OPEN/LOADING ──cancel→ CANCELLED    (PLANNER+)
 *
 * `OPEN → LOADING` is intentionally *not* mapped — BE auto-flips it when the
 * first ContainerLine is added. The kanban surfaces this as a snap-back.
 */
export function planTransition(
  from: ContainerStatus,
  to: ContainerStatus,
): TransitionPlan | null {
  if (from === to) return null

  if ((from === 'OPEN' || from === 'LOADING') && to === 'SEALED') {
    return { action: 'seal', endpoint: 'seal', requireReason: false, minPersona: 'PLANNER' }
  }
  if (from === 'SEALED' && to === 'SHIPPED') {
    return { action: 'ship', endpoint: 'ship', requireReason: false, minPersona: 'PLANNER' }
  }
  if (from === 'SEALED' && to === 'LOADING') {
    return { action: 'reopen', endpoint: 'reopen', requireReason: true, minPersona: 'ADMIN' }
  }
  if ((from === 'OPEN' || from === 'LOADING') && to === 'CANCELLED') {
    return { action: 'cancel', endpoint: 'cancel', requireReason: false, minPersona: 'PLANNER' }
  }
  return null
}

/** True when BE auto-flips OPEN→LOADING on first line; FE must not call. */
export function isAutoTransition(from: ContainerStatus, to: ContainerStatus): boolean {
  return from === 'OPEN' && to === 'LOADING'
}

export const TRANSITION_LABEL: Record<LifecycleAction, string> = {
  seal: 'Niêm phong container',
  ship: 'Xác nhận xuất tàu',
  reopen: 'Mở lại container',
  cancel: 'Huỷ container',
}

export const TRANSITION_DESCRIPTION: Record<LifecycleAction, string> = {
  seal: 'Container sẽ chuyển sang trạng thái SEALED. Sau khi niêm phong, không thể thêm/xoá dòng hàng.',
  ship:
    'Container sẽ chuyển sang trạng thái SHIPPED. Hành động cuối cùng trong vòng đời — không thể đảo ngược.',
  reopen:
    'Mở lại container đã niêm phong, đưa về trạng thái LOADING. Cần lý do (ghi audit).',
  cancel:
    'Huỷ container. Các dòng hàng bên trong sẽ được giải phóng về Sales Order gốc.',
}
