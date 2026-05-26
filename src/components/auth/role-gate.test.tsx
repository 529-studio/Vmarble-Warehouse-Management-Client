import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUsePersona = vi.fn()

vi.mock('@/lib/auth/persona', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/persona')>(
    '@/lib/auth/persona',
  )
  return { ...actual, usePersona: () => mockUsePersona() }
})

import { RoleGate } from '@/components/auth/role-gate'

describe('RoleGate', () => {
  it('renders children when persona is in allow list', () => {
    mockUsePersona.mockReturnValue('PLANNER')
    render(
      <RoleGate allow={['PLANNER', 'ADMIN']}>
        <button>Approve</button>
      </RoleGate>,
    )
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('renders nothing when persona is not allowed and no fallback', () => {
    mockUsePersona.mockReturnValue('WORKER')
    const { container } = render(
      <RoleGate allow={['PLANNER', 'ADMIN']}>
        <button>Approve</button>
      </RoleGate>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders fallback when persona is not allowed and fallback given', () => {
    mockUsePersona.mockReturnValue('WORKER')
    render(
      <RoleGate allow={['ADMIN']} fallback={<span>Liên hệ quản lý</span>}>
        <button>Force unseal</button>
      </RoleGate>,
    )
    expect(screen.getByText('Liên hệ quản lý')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('uses min hierarchy when min prop is set', () => {
    mockUsePersona.mockReturnValue('PLANNER')
    render(
      <RoleGate min="WORKER">
        <span>Visible to all</span>
      </RoleGate>,
    )
    expect(screen.getByText('Visible to all')).toBeInTheDocument()
  })

  it('hides when persona is null (logged out)', () => {
    mockUsePersona.mockReturnValue(null)
    const { container } = render(
      <RoleGate allow={['WORKER', 'PLANNER', 'ADMIN']}>
        <span>Anything</span>
      </RoleGate>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
