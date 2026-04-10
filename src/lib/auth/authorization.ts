// ── Role groups ──────────────────────────────────────────────────────────────
//
// cnc_manager scope is deferred to v2; for now it lands in the dashboard as a
// management role with no dedicated UI beyond what admin already provides.

export const DASHBOARD_ROLES = ['admin', 'accountant', 'planner', 'warehouse', 'foreman', 'cnc_manager'] as const
export const KIOSK_ROLES = ['cnc'] as const

// ── Path tables ───────────────────────────────────────────────────────────────
//
// IMPORTANT: every route physically inside (dashboard)/ or (kiosk)/ MUST be
// listed here so the middleware can enforce role-based access correctly.
// A path missing from both lists is treated as public (no role check).

const DASHBOARD_PATHS = ['/overview', '/remnants', '/costing', '/materials', '/skus', '/pos', '/plans', '/work-orders']
const KIOSK_PATHS = ['/scan', '/cutting-orders', '/report-cut', '/remnant-list', '/remnant-store']

// ── Default landing page per role ────────────────────────────────────────────

export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'warehouse':   return '/materials'
    case 'foreman':     return '/work-orders'
    case 'cnc':         return '/scan'
    default:            return '/overview'   // admin, accountant, planner, cnc_manager
  }
}

// ── Path predicates ───────────────────────────────────────────────────────────

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isKioskPath(pathname: string): boolean {
  return KIOSK_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
