import { test, expect, type Page } from '@playwright/test'

/**
 * Persona smoke for #250 (RBAC 3-tier UI).
 *
 * Two shapes — kept narrow on purpose so this stays a smoke, not a feature
 * test:
 *
 *   1. `login → landing route` proves the login hook + middleware honor the
 *      role-to-route mapping in getDefaultRouteForRole(). One assertion: URL.
 *      Viewport is whatever the project default is — page chrome is not under
 *      test.
 *
 *   2. `nav filtering` is desktop-only and skips the form. We seed cookies the
 *      way the BE-issued login flow would, then load /overview directly and
 *      check that the side nav respects can(role, 'read', resource). This
 *      isolates the role gate from the auth API + redirect chain.
 *
 * The two demo accounts the issue calls out (`warehouse / planner / admin`)
 * cover all three personas (WORKER / PLANNER / ADMIN).
 */

interface Persona {
  username: string
  role: string
  displayName: string
  /** Default route after login — must mirror getDefaultRouteForRole. */
  landing: RegExp
}

const PERSONAS: Persona[] = [
  { username: 'admin', role: 'admin', displayName: 'Quản trị viên', landing: /\/overview/ },
  { username: 'planner', role: 'planner', displayName: 'Kế hoạch sản xuất', landing: /\/overview/ },
  { username: 'warehouse', role: 'warehouse', displayName: 'Quản lý kho', landing: /\/materials/ },
]

async function mockLogin(page: Page, persona: Persona) {
  await page.route('**/api/auth/login', (route) => {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'e2e.persona.token', role: persona.role, expires_at: expires }),
    })
  })
}

async function mockMe(page: Page, persona: Persona) {
  await page.route('**/api/proxy/users/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: `user-${persona.role}`,
        username: persona.username,
        full_name: persona.displayName,
        role: persona.role,
        is_active: true,
      }),
    })
  })
}

/** Stub anything else under /api/proxy so the page never blocks on real BE. */
async function mockProxyFallback(page: Page) {
  await page.route('**/api/proxy/**', (route) => {
    if (route.request().url().includes('/users/me')) return route.fallback()
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total_items: 0, total_pages: 0, current_page: 1, limit: 20 }),
    })
  })
}

async function setAuthCookies(page: Page, persona: Persona) {
  await page.context().addCookies([
    { name: 'auth_token', value: 'e2e.persona.token', url: 'http://localhost:3000' },
    { name: 'auth_role', value: persona.role, url: 'http://localhost:3000' },
  ])
}

test.describe('Persona smoke — login redirects to default route (#250)', () => {
  for (const persona of PERSONAS) {
    test(`${persona.role} lands on ${persona.landing}`, async ({ page }) => {
      await mockLogin(page, persona)
      await mockMe(page, persona)
      await mockProxyFallback(page)

      await page.goto('/login')
      await page.getByLabel('Tên đăng nhập').fill(persona.username)
      await page.getByLabel('Mật khẩu').fill(`${persona.username}123`)
      await page.getByRole('button', { name: /đăng nhập/i }).click()

      await expect(page).toHaveURL(persona.landing)
    })
  }
})

test.describe('Persona smoke — side-nav respects role policy (#250)', () => {
  // Dashboard is desktop-only; the kiosk default viewport hides labels.
  test.use({ viewport: { width: 1280, height: 800 } })

  test('admin sees the Users entry', async ({ page }) => {
    const persona = PERSONAS[0]
    await mockMe(page, persona)
    await mockProxyFallback(page)
    await setAuthCookies(page, persona)

    // /materials renders quickly with the empty-list fallback mock. /overview
    // pulls a half-dozen aggregate endpoints and is too noisy for a smoke.
    await page.goto('/materials')
    await expect(page.getByRole('link', { name: 'Người dùng' })).toBeVisible()
  })

  test('planner sees Materials but not Users', async ({ page }) => {
    const persona = PERSONAS[1]
    await mockMe(page, persona)
    await mockProxyFallback(page)
    await setAuthCookies(page, persona)

    await page.goto('/materials')
    // Materials is visible to every dashboard role; the meaningful signal
    // is the *absence* of the admin-only Users link.
    await expect(page.getByRole('link', { name: 'Nguyên liệu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Người dùng' })).toHaveCount(0)
  })

  test('warehouse sees Materials but not Users', async ({ page }) => {
    const persona = PERSONAS[2]
    await mockMe(page, persona)
    await mockProxyFallback(page)
    await setAuthCookies(page, persona)

    await page.goto('/materials')
    await expect(page.getByRole('link', { name: 'Nguyên liệu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Người dùng' })).toHaveCount(0)
  })
})
