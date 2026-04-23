import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/api-mocks'

const BARCODE_ID = 'bc-001'

async function mockBarcodeApi(page: import('@playwright/test').Page) {
  await page.route(`**/api/proxy/barcodes/${BARCODE_ID}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: BARCODE_ID,
        work_order_id: 'wo-001',
        sku_id: 'sku-001',
        po_id: 'po-001',
        production_plan_id: 'plan-001',
        sku_code: 'PLY-1200×600',
        sku_name: 'Mặt bàn gỗ ép 1200×600',
        dimensions: '1200×600mm',
        produced_date: '2025-01-01',
        created_at: new Date().toISOString(),
      }),
    })
  })
  await page.route(`**/api/proxy/barcodes/${BARCODE_ID}/scans`, (route) => {
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'scan-001',
        barcode_id: BARCODE_ID,
        checkpoint: 'CNC_COMPLETE',
        scanned_by: 'device-test',
        scanned_at: new Date().toISOString(),
      }),
    })
  })
}

test.describe('Kiosk scan checkpoint', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'cnc')
  })

  test('scan page lists all 3 checkpoint cards', async ({ page }) => {
    await page.goto('/scan')
    await expect(page.getByText('Quét điểm kiểm tra')).toBeVisible()
    await expect(page.getByText('CNC')).toBeVisible()
    await expect(page.getByText('Hoàn thiện')).toBeVisible()
    await expect(page.getByText('Xuất kho')).toBeVisible()
  })

  test('entering CNC checkpoint page shows scanner UI', async ({ page }) => {
    await page.goto('/scan/cnc')
    await expect(page.getByText(/quét: cnc/i)).toBeVisible()
    // Step 2 card always renders
    await expect(page.getByText(/bước 2.*xác nhận/i)).toBeVisible()
    // Confirm button present but disabled (no barcode yet)
    const btn = page.getByRole('button', { name: /xác nhận hoàn thành/i })
    await expect(btn).toBeDisabled()
  })

  test('manual barcode input shows product info card', async ({ page }) => {
    await mockBarcodeApi(page)
    await page.goto('/scan/cnc')

    // Camera will fail in headless CI — find manual input
    const input = page.getByPlaceholder(/nhập mã rồi nhấn enter/i)
    await input.fill(BARCODE_ID)
    await input.press('Enter')

    // Product info should appear in the confirmation card
    await expect(page.getByText('PLY-1200×600')).toBeVisible({ timeout: 5000 })
    const btn = page.getByRole('button', { name: /xác nhận hoàn thành/i })
    await expect(btn).toBeEnabled()
  })
})
