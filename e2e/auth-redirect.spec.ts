import { test, expect } from '@playwright/test'

test.describe('Auth redirect', () => {
  test('unauthenticated user accessing kiosk is redirected to /login', async ({ page }) => {
    // No cookies set — middleware should redirect
    await page.goto('/cutting-orders')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user accessing dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/overview')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible without auth', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
    // Should show a login form element
    await expect(page.getByRole('button', { name: /đăng nhập/i })).toBeVisible()
  })
})
