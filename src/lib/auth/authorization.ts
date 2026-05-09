export const DASHBOARD_ROLES = ['admin', 'accountant', 'planner', 'warehouse', 'foreman', 'cnc_manager'] as const
export const KIOSK_ROLES = ['cnc'] as const

export type DashboardRole = (typeof DASHBOARD_ROLES)[number]
export type KioskRole = (typeof KIOSK_ROLES)[number]
export type AppRole = DashboardRole | KioskRole

export type AppResource =
  | 'overview'
  | 'remnants'
  | 'costing'
  | 'materials'
  | 'skus'
  | 'pos'
  | 'plans'
  | 'work_orders'
  | 'barcodes'
  | 'cutting_dispatch'
  | 'scan'
  | 'cutting_orders'
  | 'report_cut'
  | 'remnant_list'
  | 'remnant_store'
  | 'account'
  | 'users'
  | 'profile'
  | 'purchasing'

export type AppAction =
  | 'read'
  | 'create'
  | 'approve'
  | 'cancel'
  | 'advance'
  | 'compute'
  | 'finalize'
  | 'adjust'
  | 'consume'
  | 'generate'
  | 'assign'
  | 'toggle_active'

const DASHBOARD_PATHS = [
  '/overview',
  '/remnants',
  '/costing',
  '/materials',
  '/skus',
  '/pos',
  '/plans',
  '/work-orders',
  '/barcodes',
  '/cutting-dispatch',
  '/users',
  '/profile',
  '/purchasing',
]

const KIOSK_PATHS = ['/scan', '/cutting-orders', '/report-cut', '/remnant-list', '/remnant-store', '/account']

const RESOURCE_BY_PATH: Array<{ path: string; resource: AppResource }> = [
  { path: '/overview', resource: 'overview' },
  { path: '/remnants', resource: 'remnants' },
  { path: '/costing', resource: 'costing' },
  { path: '/materials', resource: 'materials' },
  { path: '/skus', resource: 'skus' },
  { path: '/pos', resource: 'pos' },
  { path: '/plans', resource: 'plans' },
  { path: '/work-orders', resource: 'work_orders' },
  { path: '/barcodes', resource: 'barcodes' },
  { path: '/cutting-dispatch', resource: 'cutting_dispatch' },
  { path: '/users', resource: 'users' },
  { path: '/profile', resource: 'profile' },
  { path: '/purchasing', resource: 'purchasing' },
  { path: '/scan', resource: 'scan' },
  { path: '/cutting-orders', resource: 'cutting_orders' },
  { path: '/report-cut', resource: 'report_cut' },
  { path: '/remnant-list', resource: 'remnant_list' },
  { path: '/remnant-store', resource: 'remnant_store' },
  { path: '/account', resource: 'account' },
]

const DASHBOARD_RESOURCES: AppResource[] = [
  'overview',
  'remnants',
  'costing',
  'materials',
  'skus',
  'pos',
  'plans',
  'work_orders',
  'barcodes',
  'cutting_dispatch',
  'profile',
  'purchasing',
]

function matchPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function readOnly(resources: readonly AppResource[]): Partial<Record<AppResource, readonly AppAction[]>> {
  return Object.fromEntries(resources.map((resource) => [resource, ['read'] as const]))
}

const POLICY: Record<AppRole, Partial<Record<AppResource, readonly AppAction[]>>> = {
  admin: {
    ...readOnly(DASHBOARD_RESOURCES),
    users: ['read', 'create', 'toggle_active'],
    pos: ['read', 'create'],
    plans: ['read', 'create', 'approve', 'cancel'],
    work_orders: ['read', 'create', 'advance', 'assign', 'consume', 'generate'],
    cutting_dispatch: ['read', 'assign'],
    costing: ['read', 'compute', 'finalize', 'adjust'],
    purchasing: ['read', 'create', 'cancel'],
  },
  accountant: {
    ...readOnly(DASHBOARD_RESOURCES),
    pos: ['read', 'create'],
    costing: ['read', 'compute', 'finalize', 'adjust'],
  },
  planner: {
    ...readOnly(DASHBOARD_RESOURCES),
    plans: ['read', 'create', 'approve', 'cancel'],
    work_orders: ['read', 'create'],
  },
  warehouse: {
    ...readOnly(DASHBOARD_RESOURCES),
    purchasing: ['read', 'create', 'cancel'],
  },
  foreman: {
    ...readOnly(['profile']),
    work_orders: ['read', 'advance', 'consume', 'generate'],
    barcodes: ['read'],
  },
  cnc_manager: {
    ...readOnly(['profile']),
    work_orders: ['read'],
    cutting_dispatch: ['read', 'assign'],
  },
  cnc: {
    scan: ['read'],
    cutting_orders: ['read'],
    report_cut: ['read'],
    remnant_list: ['read'],
    remnant_store: ['read'],
    account: ['read'],
  },
}

export function isDashboardRole(role: string): role is DashboardRole {
  return DASHBOARD_ROLES.includes(role as DashboardRole)
}

export function isKioskRole(role: string): role is KioskRole {
  return KIOSK_ROLES.includes(role as KioskRole)
}

export function isAppRole(role: string): role is AppRole {
  return isDashboardRole(role) || isKioskRole(role)
}

export function can(
  role: string | null | undefined,
  action: AppAction,
  resource: AppResource,
): boolean {
  if (!role || !isAppRole(role)) return false
  const allowedActions = POLICY[role][resource]
  return !!allowedActions?.includes(action)
}

export function getResourceForPath(pathname: string): AppResource | null {
  const hit = RESOURCE_BY_PATH.find((entry) => matchPath(pathname, entry.path))
  return hit?.resource ?? null
}

export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'warehouse':
      return '/materials'
    case 'foreman':
      return '/work-orders'
    case 'cnc_manager':
      return '/cutting-dispatch'
    case 'cnc':
      return '/scan'
    default:
      return '/overview'
  }
}

export function getCurrentRoleFromCookie(): AppRole | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)auth_role=([^;]+)/)
  if (!match) return null
  const decoded = decodeURIComponent(match[1])
  return isAppRole(decoded) ? decoded : null
}

export function isDashboardPath(pathname: string): boolean {
  return DASHBOARD_PATHS.some((path) => matchPath(pathname, path))
}

export function isKioskPath(pathname: string): boolean {
  return KIOSK_PATHS.some((path) => matchPath(pathname, path))
}
