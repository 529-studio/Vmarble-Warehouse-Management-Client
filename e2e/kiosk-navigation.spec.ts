import { test, expect } from '@playwright/test'
import { loginAs, mockWorkOrders } from './helpers/api-mocks'

test.describe('Kiosk navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'cnc')
    await mockWorkOrders(page)
  })

  test('bottom nav renders all tabs for cnc role', async ({ page }) => {
    await page.goto('/cutting-orders')
    // CNC role tabs: Lệnh cắt, Báo cáo, Quét mã, Tấm lẻ, Tài khoản
    await expect(page.getByRole('link', { name: 'Lệnh cắt' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Báo cáo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Quét mã' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tấm lẻ' })).toBeVisible()
  })

  test('navigating to Quét mã tab loads scan page', async ({ page }) => {
    await page.goto('/cutting-orders')
    await page.getByRole('link', { name: 'Quét mã' }).click()
    await expect(page).toHaveURL('/scan')
    await expect(page.getByText('Quét điểm kiểm tra')).toBeVisible()
  })

  test('navigating to Báo cáo tab loads report-cut page', async ({ page }) => {
    await page.goto('/cutting-orders')
    await page.getByRole('link', { name: 'Báo cáo' }).click()
    await expect(page).toHaveURL('/report-cut')
  })
})
