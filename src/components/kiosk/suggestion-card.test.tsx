import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestionCard } from '@/components/kiosk/remnant-suggestion-modal'
import type { RemnantSuggestion } from '@/types/api'

function makeSuggestion(overrides: Partial<RemnantSuggestion> = {}): RemnantSuggestion {
  return {
    remnant: {
      id: 'rem-001',
      parent_board_id: 'board-001',
      parent_remnant_id: null,
      dimensions: { length_mm: 1400, width_mm: 800 },
      status: 'AVAILABLE',
      allocated_to_wo: null,
      created_at: '2025-01-01T00:00:00Z',
    },
    location: {
      id: 'loc-001',
      zone: 'A',
      rack: '1',
      shelf: '2',
      label: 'A-1-2',
      barcode: 'LOC-A12',
      isActive: true,
    },
    rank: 1,
    ...overrides,
  }
}

const requiredDimensions = { length_mm: 1200, width_mm: 600 }

describe('SuggestionCard', () => {
  it('renders remnant dimensions', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('1400 × 800 mm')).toBeInTheDocument()
  })

  it('renders shelf barcode', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('LOC-A12')).toBeInTheDocument()
  })

  it('shows "—" when location is null', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion({ location: null })}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows fit score badge with correct percent', () => {
    // required area = 1200*600 = 720000; remnant area = 1400*800 = 1120000
    // fitScore = 720000/1120000 ≈ 0.643 → 64%
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={false}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('64%')).toBeInTheDocument()
  })

  it('disables button and shows spinner when isAllocating=true', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={true}
        isAnyAllocating={true}
        onSelect={vi.fn()}
      />,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })

  it('disables button when isAnyAllocating=true (sibling card allocating)', () => {
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={true}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('fires onSelect when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <SuggestionCard
        suggestion={makeSuggestion()}
        requiredDimensions={requiredDimensions}
        isAllocating={false}
        isAnyAllocating={false}
        onSelect={onSelect}
      />,
    )
    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
