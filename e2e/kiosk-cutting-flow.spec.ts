import { test, expect } from '@playwright/test'
import { loginAs, mockWorkOrders, mockRemnantSuggestions } from './helpers/api-mocks'

test.describe('Kiosk cutting flow (smoke)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'cnc')
    await mockWorkOrders(page)
    await mockRemnantSuggestions(page)
  })

  test('cutting orders list renders work order card', async ({ page }) => {
    await page.goto('/cutting-orders')

    // SKU code appears on the card
    await expect(page.getByText('PLY-1200×600')).toBeVisible()
    // SKU name visible
    await expect(page.getByText('Mặt bàn gỗ ép 1200×600')).toBeVisible()
    // Primary action button present
    await expect(page.getByRole('button', { name: /bắt đầu cắt/i })).toBeVisible()
  })

  test('tapping "Bắt đầu cắt" opens remnant suggestion modal', async ({ page }) => {
    await page.goto('/cutting-orders')

    await page.getByRole('button', { name: /bắt đầu cắt/i }).click()

    // Suggestion modal should appear with the mocked remnant
    await expect(page.getByText('Gợi ý tấm').or(page.getByText('Tấm lẻ gợi ý')).or(page.getByText('A-1-2'))).toBeVisible({ timeout: 5000 })
  })

  test('viewport is 375px — kiosk baseline', async ({ page }) => {
    await page.goto('/cutting-orders')
    const width = page.viewportSize()?.width
    expect(width).toBe(375)
  })

  test('loading skeleton shown before data arrives', async ({ page }) => {
    // Delay the mock response to catch the skeleton
    await page.route('**/api/proxy/work-orders*', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total_items: 0,
          total_pages: 1,
          current_page: 1,
          limit: 20,
        }),
      })
    })

    await page.goto('/cutting-orders')

    // Skeleton present during loading
    const skeleton = page.locator('.animate-pulse').first()
    await expect(skeleton).toBeVisible()
  })

  test('empty state shown when no work orders', async ({ page }) => {
    // Override with empty response
    await page.route('**/api/proxy/work-orders*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          total_items: 0,
          total_pages: 0,
          current_page: 1,
          limit: 20,
        }),
      })
    })

    await page.goto('/cutting-orders')
    await expect(page.getByText(/không có lệnh cắt/i)).toBeVisible()
  })
})
