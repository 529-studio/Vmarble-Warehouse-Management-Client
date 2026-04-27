import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mock Next.js navigation ───────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams('wo_id=wo-001'),
}))

// ── Mock all heavy domain hooks ───────────────────────────────────────────────
vi.mock('@/lib/hooks/use-cutting-orders', () => ({
  useCuttingOrder: () => ({
    data: {
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
    },
    isLoading: false,
    isError: false,
  }),
  useRecordCut: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/lib/hooks/use-barcode', () => ({
  useGenerateBarcode: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useOpenBarcodeLabelPdf: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useLabelDownload: () => ({ download: vi.fn(), isPending: false }),
}))

vi.mock('@/lib/hooks/use-plans', () => ({
  usePlan: () => ({ data: null, isLoading: false }),
}))

vi.mock('@/lib/hooks/use-remnants', () => ({
  useAvailableSheets: () => ({
    data: { items: [], total_items: 0, total_pages: 0, current_page: 1, limit: 200 },
    isLoading: false,
  }),
  useRemnant: () => ({ data: null, isLoading: false }),
}))

// ── Import component after mocks ──────────────────────────────────────────────
import { ReportCutForm } from '@/components/kiosk/report-cut-form'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('ReportCutForm (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and shows SKU code in header', () => {
    render(<ReportCutForm />, { wrapper })
    // SKU code appears in the subtitle "PLY-1200×600 · 1200×600 mm"
    expect(screen.getByText(/PLY-1200×600/)).toBeInTheDocument()
  })

  it('shows cut dimension input fields', () => {
    render(<ReportCutForm />, { wrapper })
    // Form has used + remnant dimension fields, both labelled "Chiều dài/rộng (mm)"
    expect(screen.getAllByLabelText('Chiều dài (mm)').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByLabelText('Chiều rộng (mm)').length).toBeGreaterThanOrEqual(1)
  })

  it('has a "Báo cáo kết quả" submit button', () => {
    render(<ReportCutForm />, { wrapper })
    const submitBtn = screen.getByRole('button', { name: /báo cáo kết quả/i })
    expect(submitBtn).toBeInTheDocument()
  })
})
