import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CuttingOrderCard } from '@/components/kiosk/cutting-order-card'
import type { WorkOrder } from '@/types/api'

const baseOrder: WorkOrder = {
  id: 'wo-001',
  plan_id: 'plan-001',
  sku_id: 'sku-001',
  sku_code: 'PLY-1200×600',
  sku_name: 'Mặt bàn gỗ ép 1200×600',
  sku_dimensions: { length_mm: 1200, width_mm: 600 },
  quantity: 5,
  status: 'IN_CUTTING',
  assigned_to: null,
  assigned_at: null,
  estimated_hours: null,
  machine_slot_id: null,
  created_at: '2025-01-01T00:00:00Z',
}

describe('CuttingOrderCard', () => {
  it('renders SKU code and name', () => {
    render(<CuttingOrderCard order={baseOrder} onStartCutting={vi.fn()} />)
    expect(screen.getByText('PLY-1200×600')).toBeInTheDocument()
    expect(screen.getByText('Mặt bàn gỗ ép 1200×600')).toBeInTheDocument()
  })

  it('renders dimensions and quantity badge', () => {
    render(<CuttingOrderCard order={baseOrder} onStartCutting={vi.fn()} />)
    expect(screen.getByText('1200 × 600 mm')).toBeInTheDocument()
    expect(screen.getByText('SL: 5')).toBeInTheDocument()
  })


  it('falls back to truncated sku_id when sku_code is absent', () => {
    const order = { ...baseOrder, sku_code: undefined }
    render(<CuttingOrderCard order={order} onStartCutting={vi.fn()} />)
    expect(screen.getByText(/sku-001/)).toBeInTheDocument()
  })

  it('shows default SKU name when sku_name is absent', () => {
    const order = { ...baseOrder, sku_name: undefined }
    render(<CuttingOrderCard order={order} onStartCutting={vi.fn()} />)
    expect(screen.getByText('Chưa có tên SKU')).toBeInTheDocument()
  })


  it('fires onStartCutting with the order when button is clicked', async () => {
    const user = userEvent.setup()
    const onStartCutting = vi.fn()
    render(<CuttingOrderCard order={baseOrder} onStartCutting={onStartCutting} />)
    await user.click(screen.getByRole('button', { name: /bắt đầu cắt/i }))
    expect(onStartCutting).toHaveBeenCalledTimes(1)
    expect(onStartCutting).toHaveBeenCalledWith(baseOrder)
  })
})
