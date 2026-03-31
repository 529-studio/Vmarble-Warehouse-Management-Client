export const DASHBOARD_ROLES = ['admin', 'accountant', 'planner'] as const
export const KIOSK_ROLES = ['warehouse', 'cnc', 'foreman'] as const

const DASHBOARD_PATHS = ['/overview', '/remnants', '/costing']
const KIOSK_PATHS = ['/scan', '/cutting-orders', '/report-cut', '/remnant-list', '/remnant-store']

export function getDefaultRouteForRole(role: string): string {
  return KIOSK_ROLES.includes(role as (typeof KIOSK_ROLES)[number]) ? '/scan' : '/overview'
}

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isKioskPath(pathname: string): boolean {
  return KIOSK_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
