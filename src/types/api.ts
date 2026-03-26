// ---------------------------------------------------------------------------
// API DTOs — mirrors the Go backend types (snake_case as returned by the API)
// ---------------------------------------------------------------------------

// ── Shared ──────────────────────────────────────────────────────────────────

export type MaterialType = 'PLYWOOD' | 'MDF' | 'HDF' | string

/** Backend: AVAILABLE | ALLOCATED | CONSUMED | WASTE */
export type RemnantStatus = 'AVAILABLE' | 'ALLOCATED' | 'CONSUMED' | 'WASTE'

export type WorkOrderStatus =
  | 'PLANNED'
  | 'IN_CUTTING'
  | 'IN_PROCESSING'
  | 'COMPLETED'
  | 'COSTED'

export type QualityGrade = 'A' | 'B' | 'C'

export type GrainPattern = 'WITH_GRAIN' | 'CROSS_GRAIN' | 'NONE'

export type ScanCheckpoint =
  | 'CNC_COMPLETE'
  | 'FINISHING_COMPLETE'
  | 'WAREHOUSE_SHIP'

// ── Money (domain.Money) ─────────────────────────────────────────────────────

export interface Money {
  amount: number
  currency: string
}

// ── Inventory ───────────────────────────────────────────────────────────────

/** GET /api/v1/inventory/sheets */
export interface BoardSheet {
  id: string
  lot_id: string
  dimensions: { length_mm: number; width_mm: number }
  cost_per_sheet: Money
  issued_to_work_order_id: string | null
  status: string
}

/** GET /api/v1/inventory/remnants */
export interface Remnant {
  id: string
  parent_board_id: string | null
  parent_remnant_id: string | null
  dimensions: { length_mm: number; width_mm: number }
  status: RemnantStatus
  allocated_to_wo: string | null
  created_at: string
}

export interface RemnantLineage {
  remnant: Remnant
  children: RemnantLineage[]
}

export interface StorageLocation {
  id: string
  zone: string
  rack: string
  shelf: string
  label: string
  barcode: string
  isActive: boolean
}

export interface OverflowStatus {
  status: 'GREEN' | 'YELLOW' | 'RED'
  remnantAreaM2: number
  rawStockAreaM2: number
  utilizationPct: number
  blockNewSheetIssue: boolean
  message: string
}

// ── Production ──────────────────────────────────────────────────────────────

export interface PurchaseOrder {
  id: string
  poCode: string
  items: POItem[]
  deliveryDate: string
  createdAt: string
}

export interface POItem {
  sku: string
  quantity: number
  sellingPrice: number
}

export interface ProductionPlan {
  id: string
  poId: string
  items: PlanItem[]
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'DONE'
  createdAt: string
}

export interface PlanItem {
  sku: string
  quantity: number
  shapeType: 'ROUND' | 'RECT_DINING' | string
  isMetalRequired: boolean
}

/** GET /api/v1/work-orders */
export interface WorkOrder {
  id: string
  plan_id: string
  sku_id: string
  quantity: number
  status: WorkOrderStatus
  created_at: string
}

// ── Costing ──────────────────────────────────────────────────────────────────

/** GET /api/v1/costing  or  GET /api/v1/costing/{workOrderID} */
export interface CostingRecord {
  id: string
  work_order_id: string
  sku_id: string
  material_cost: Money
  auxiliary_cost: Money
  total_cost: Money
  finalized: boolean
  created_at: string
}

// ── Cutting ──────────────────────────────────────────────────────────────────

export interface CuttingRecord {
  id: string
  workOrderId: string
  boardSheetId: string | null
  remnantId: string | null
  usedLengthMm: number
  usedWidthMm: number
  remnantProduced: Remnant | null
  wasteMm2: number
  operatorId: string
  cutAt: string
}

/** POST /api/v1/inventory/cuts */
export interface RecordCutInput {
  work_order_id: string
  dimensions: { length_mm: number; width_mm: number }
  remnant_dimensions?: { length_mm: number; width_mm: number }
  is_waste: boolean
}

export interface RecordCutResponse {
  cuttingRecord: CuttingRecord
  remnant: Remnant | null
  barcodeIds: string[]
}

// ── Allocation ───────────────────────────────────────────────────────────────

export interface RemnantSuggestion {
  remnant: Remnant
  fitScore: number
  ageScore: number
  combinedScore: number
  wasteAreaMm2: number
  wastePct: number
}

export interface SuggestAllocationInput {
  workOrderId: string
  requiredDimensions: { lengthMm: number; widthMm: number }[]
}

export interface SuggestAllocationResponse {
  suggestions: RemnantSuggestion[]
}

// ── Barcode ──────────────────────────────────────────────────────────────────

export interface BarcodeRecord {
  id: string
  entityType: 'WIP' | 'REMNANT'
  entityId: string
  sku: string | null
  dimensions: { lengthMm: number; widthMm: number; thicknessMm: number }
  lot: string
  location: string | null
  qrContent: string
  createdAt: string
}

export interface ScanEvent {
  id: string
  barcodeId: string
  checkpoint: ScanCheckpoint
  scannedBy: string
  scannedAt: string
}

// ── Dashboard (computed client-side from real API data) ──────────────────────

export interface RemnantSummary {
  totalCount: number
  totalAreaM2: number
  avgAgeDays: number
  byMaterial: { materialType: MaterialType; count: number; areaM2: number }[]
}

export interface CuttingEfficiency {
  period: string
  totalAreaCutM2: number
  wasteAreaM2: number
  wastePct: number
}

// ── Pagination / shared response wrappers ────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
