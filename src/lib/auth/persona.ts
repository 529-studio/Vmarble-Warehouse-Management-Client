import { useSyncExternalStore } from 'react'
import { getCurrentRoleFromCookie, type AppRole } from './authorization'

export type Persona = 'WORKER' | 'PLANNER' | 'ADMIN'

const PERSONA_BY_ROLE: Record<AppRole, Persona> = {
  admin: 'ADMIN',
  planner: 'PLANNER',
  accountant: 'PLANNER',
  warehouse: 'WORKER',
  cnc: 'WORKER',
  cnc_manager: 'WORKER',
  foreman: 'WORKER',
}

export function personaOf(role: string | null | undefined): Persona | null {
  if (!role) return null
  return PERSONA_BY_ROLE[role as AppRole] ?? null
}

export function isAtLeast(persona: Persona | null, min: Persona): boolean {
  if (!persona) return false
  const order: Record<Persona, number> = { WORKER: 1, PLANNER: 2, ADMIN: 3 }
  return order[persona] >= order[min]
}

export function usePersona(): Persona | null {
  const role = useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
  return personaOf(role)
}
