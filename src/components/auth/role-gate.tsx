'use client'

import type { ReactNode } from 'react'
import { isAtLeast, usePersona, type Persona } from '@/lib/auth/persona'

type RoleGateProps =
  | {
      /** List of personas allowed to see the children. */
      allow: Persona[]
      min?: never
      fallback?: ReactNode
      children: ReactNode
    }
  | {
      /**
       * Minimum persona — treats personas as a hierarchy
       * (WORKER < PLANNER < ADMIN) and grants access to anyone at or above.
       */
      min: Persona
      allow?: never
      fallback?: ReactNode
      children: ReactNode
    }

/**
 * Render `children` only when the current user's persona is in `allow` (or
 * at/above `min`). Renders `fallback` (default: nothing) otherwise.
 *
 * The gate hides the element rather than disabling it — workers should not
 * see destructive controls greyed out, since the label itself can leak
 * planner/admin operations.
 */
export function RoleGate({ allow, min, fallback = null, children }: RoleGateProps) {
  const persona = usePersona()
  const allowed = min
    ? isAtLeast(persona, min)
    : persona !== null && allow.includes(persona)
  return <>{allowed ? children : fallback}</>
}
