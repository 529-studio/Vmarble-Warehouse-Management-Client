import type { Page } from '@playwright/test'

/**
 * Sets auth_token + auth_role cookies so the middleware lets the page through.
 * The token is a dummy JWT-shaped string — no signature validation in middleware,
 * it only checks existence.
 */
export async function loginAs(page: Page, role = 'cnc') {
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: 'e2e.test.token',
      url: 'http://localhost:3000',
      httpOnly: false,
    },
    {
      name: 'auth_role',
      value: role,
      url: 'http://localhost:3000',
      httpOnly: false,
    },
  ])
}

/**
 * Intercepts the work-orders list API with a minimal mock response.
 */
export async function mockWorkOrders(page: Page) {
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
            created_at: new Date().toISOString(),
          },
        ],
        total_items: 1,
        total_pages: 1,
        current_page: 1,
        limit: 20,
      }),
    })
  })
}

/**
 * Intercepts remnant suggestions API.
 */
export async function mockRemnantSuggestions(page: Page) {
  await page.route('**/api/proxy/inventory/remnants/suggestions*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          remnant: {
            id: 'rem-001',
            parent_board_id: 'board-001',
            parent_remnant_id: null,
            dimensions: { length_mm: 1300, width_mm: 700 },
            status: 'AVAILABLE',
            allocated_to_wo: null,
            lot_batch: 'SUP-ABC-001',
            created_at: new Date().toISOString(),
          },
          location: { id: 'loc-001', zone: 'A', rack: '1', shelf: '2', label: 'A-1-2', barcode: 'LOC-A12', isActive: true },
          rank: 1,
        },
      ]),
    })
  })
}

/**
 * Intercepts the materials list API.
 */
export async function mockMaterials(page: Page) {
  await page.route('**/api/proxy/materials*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'mat-001', type: 'PLYWOOD', name: 'Gỗ ép 18mm', unit: 'tấm', created_at: new Date().toISOString() },
      ]),
    })
  })
}
