export const DASHBOARD_ROLES = ['admin', 'accountant', 'planner', 'warehouse'] as const
export const KIOSK_ROLES = ['cnc', 'foreman'] as const

const DASHBOARD_PATHS = ['/overview', '/remnants', '/costing', '/materials', '/skus', '/pos', '/plans']
const KIOSK_PATHS = ['/scan', '/cutting-orders', '/report-cut', '/remnant-list', '/remnant-store', '/work-orders']

export function getDefaultRouteForRole(role: string): string {
  if (role === 'warehouse') return '/materials'
  return KIOSK_ROLES.includes(role as (typeof KIOSK_ROLES)[number]) ? '/scan' : '/overview'
}

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function isKioskPath(pathname: string): boolean {
  return KIOSK_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
