import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUseOverflowStatus = vi.fn()

vi.mock('@/lib/hooks/use-inventory', () => ({
  useOverflowStatus: () => mockUseOverflowStatus(),
}))

import { OverflowBanner } from '@/components/inventory/overflow-banner'

describe('OverflowBanner', () => {
  it('renders nothing when query has no data', () => {
    mockUseOverflowStatus.mockReturnValue({ data: undefined })
    const { container } = render(<OverflowBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when status is GREEN (block flag false)', () => {
    mockUseOverflowStatus.mockReturnValue({
      data: {
        status: 'GREEN',
        overflow_pct: 8.2,
        threshold_pct: 15,
        block_new_sheet_issue: false,
        total_remnant_area_mm2: 0,
        total_sheet_area_mm2: 0,
      },
    })
    const { container } = render(<OverflowBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the red sticky banner when block_new_sheet_issue is true', () => {
    mockUseOverflowStatus.mockReturnValue({
      data: {
        status: 'RED',
        overflow_pct: 18.4,
        threshold_pct: 15,
        block_new_sheet_issue: true,
        total_remnant_area_mm2: 0,
        total_sheet_area_mm2: 0,
      },
    })
    render(<OverflowBanner />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Kho tấm lẻ vượt 15%/)).toBeInTheDocument()
    expect(screen.getByText(/18\.4%/)).toBeInTheDocument()
  })
})
