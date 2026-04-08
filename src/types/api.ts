// ---------------------------------------------------------------------------
// API DTOs — mirrors the Go backend types (snake_case as returned by the API)
// ---------------------------------------------------------------------------

// ── Shared ──────────────────────────────────────────────────────────────────

export type MaterialType = 'PLYWOOD' | 'GLUE' | 'METAL' | 'OTHER' | string

// ── Material (catalog) ───────────────────────────────────────────────────────

/** GET /api/v1/materials */
export interface Material {
  id: string
  type: MaterialType
  name: string
  unit: string
  created_at: string
}

export interface CreateMaterialInput {
  type: 'PLYWOOD' | 'GLUE' | 'METAL' | 'OTHER'
  name: string
  unit: string
}

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
  /** SKU code (e.g. "PLY-1200×600") — included when work-order list is enriched */
  sku_code?: string
  /** Human-readable SKU name */
  sku_name?: string
  /** Required cut dimensions from the SKU */
  dimensions?: { length_mm: number; width_mm: number }
  /** Material type (PLYWOOD / MDF / HDF) */
  material_type?: MaterialType
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

/** POST /api/v1/inventory/cuts — mirrors Go RecordCutInput exactly */
export interface RecordCutInput {
  /** Exactly one of sheet_id or remnant_id must be set. */
  sheet_id?: string
  remnant_id?: string
  work_order_id: string
  sku_id: string
  used_dimension: { length_mm: number; width_mm: number }
  /** Omit entirely when the cut produces no remnant (waste). */
  remnant_dimension?: { length_mm: number; width_mm: number }
  /** Optional usable-area override (e.g. chipped corner). Both or neither. */
  bounding_box_length_mm?: number
  bounding_box_width_mm?: number
}

/** Response from POST /api/v1/inventory/cuts */
export interface RecordCutResponse {
  cutting_record_id: string
  /** Present only when the cut produced a remnant. */
  remnant_id?: string | null
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

// ── Catalog — SKU ────────────────────────────────────────────────────────────

/** GET /api/v1/skus, POST /api/v1/skus */
export interface SKU {
  id: string
  code: string
  name: string
  dimensions: { length_mm: number; width_mm: number }
  requires_metal: boolean
  created_at: string
}

export interface CreateSKUInput {
  code: string
  name: string
  dimensions: { length_mm: number; width_mm: number }
  requires_metal: boolean
}

/** GET /api/v1/skus/:id/bom, PUT /api/v1/skus/:id/bom */
export interface BOMItem {
  material_id: string
  /** Required by backend — must match the material's type (PLYWOOD, GLUE, METAL, OTHER) */
  material_type: MaterialType
  /** Human-readable material name — included in GET /bom response */
  material_name?: string
  quantity_per_unit: number
  unit: string
}

export interface SetBOMInput {
  components: BOMItem[]
}

export interface BOMResponse {
  sku_id: string
  components: BOMItem[]
}

// ── Pagination / shared response wrappers ────────────────────────────────────

/** Matches the Go backend PagedResult[T] envelope */
export interface PagedResult<T> {
  items: T[]
  total_items: number
  total_pages: number
  current_page: number
  limit: number
}

/** @deprecated use PagedResult instead */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

/** Query params sent to paginated endpoints */
export interface PageParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}
