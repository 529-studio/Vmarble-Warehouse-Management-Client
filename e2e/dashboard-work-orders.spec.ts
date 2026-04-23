import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/api-mocks'

async function mockDashboardWorkOrders(page: import('@playwright/test').Page) {
  await page.route('**/api/proxy/work-orders*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'wo-001',
            plan_id: 'plan-001',
            sku_id: 'sku-001',
            sku_code: 'PLY-1200×600',
            sku_name: 'Mặt bàn gỗ ép 1200×600',
            sku_dimensions: { length_mm: 1200, width_mm: 600 },
            material_type: 'PLYWOOD',
            material_id: 'mat-001',
            quantity: 5,
            status: 'IN_CUTTING',
            assigned_to_id: null,
            assigned_to_name: null,
            created_at: '2025-01-01T00:00:00Z',
          },
          {
            id: 'wo-002',
            plan_id: 'plan-001',
            sku_id: 'sku-002',
            sku_code: 'PLY-800×400',
            sku_name: 'Mặt ghế 800×400',
            sku_dimensions: { length_mm: 800, width_mm: 400 },
            material_type: 'PLYWOOD',
            material_id: 'mat-001',
            quantity: 10,
            status: 'PLANNED',
            assigned_to_id: null,
            assigned_to_name: null,
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        total_items: 2,
        total_pages: 1,
        current_page: 1,
        limit: 20,
      }),
    })
  })
}

test.describe('Dashboard work orders list', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'foreman')
    await mockDashboardWorkOrders(page)
  })

  test('work orders page renders WO rows from API', async ({ page }) => {
    await page.goto('/work-orders')
    await expect(page.getByText('PLY-1200×600')).toBeVisible()
    await expect(page.getByText('PLY-800×400')).toBeVisible()
  })

  test('page heading is visible', async ({ page }) => {
    await page.goto('/work-orders')
    await expect(page.getByRole('heading', { name: /lệnh sản xuất/i })).toBeVisible()
  })

  test('side nav shows Lệnh sản xuất link for foreman', async ({ page }) => {
    await page.goto('/work-orders')
    await expect(page.getByRole('link', { name: 'Lệnh sản xuất' })).toBeVisible()
  })

  test('empty state shown when no work orders exist', async ({ page }) => {
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
    await page.goto('/work-orders')
    await expect(page.getByText(/không có lệnh/i).or(page.getByText(/chưa có/i))).toBeVisible({ timeout: 5000 })
  })
})
