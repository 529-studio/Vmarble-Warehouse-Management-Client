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
  | 'FINISHED_GOODS'
  | 'SHIPPED'

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
  /** Material ID from catalog — used to filter sheets for a selected work order material */
  material_id?: string | null
  /** Human-readable material name */
  material_name?: string | null
  /** Human-readable lot batch code (e.g. "SUP-ABC-001") — preferred for display */
  lot_batch?: string | null
  /** Supplier code inherited from board sheet material */
  supplier_code?: string | null
}

/** GET /api/v1/inventory/remnants */
export interface Remnant {
  id: string
  parent_board_id: string | null
  parent_remnant_id: string | null
  dimensions: { length_mm: number; width_mm: number }
  status: RemnantStatus
  allocated_to_wo: string | null
  // Inherited material metadata from source board/remnant
  supplier_code?: string | null
  lot_batch?: string | null
  grain_pattern?: string | null
  quality_grade?: string | null
  // Usable area after any chipped corners are excluded; used for allocation matching
  bounding_box_length_mm?: number | null
  bounding_box_width_mm?: number | null
  // Physical shelf reference — UUID only; fetch /storage-locations for the full label
  bin_location_id?: string | null
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

/** GET /api/v1/inventory/overflow-status — mirrors Go inventory.OverflowStatus */
export interface OverflowStatus {
  status: 'GREEN' | 'YELLOW' | 'RED'
  /** Total remnant area / total raw stock area, expressed as percent (0–100+) */
  overflow_pct: number
  /** Threshold percent above which `status` flips to RED (default 15) */
  threshold_pct: number
  /** True when sheet pre-assignment must be blocked (status === 'RED') */
  block_new_sheet_issue: boolean
  total_remnant_area_mm2: number
  total_sheet_area_mm2: number
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

/** Mirrors backend order.LineItem */
export interface LineItem {
  id: string
  po_id: string
  sku_id: string
  /** SKU code enriched by list endpoint */
  sku_code?: string
  quantity: number
  selling_price: Money
}

/** Mirrors backend order.PO */
export interface PO {
  id: string
  code: string
  expected_delivery: string
  created_at: string
  /** Summary fields added by backend issue #195 */
  total_skus?: number
  total_quantity?: number
  /** Included when fetched via GET /pos/:id */
  line_items?: LineItem[]
}

export interface CreateLineItemInput {
  sku_id: string
  quantity: number
  selling_price: Money
}

export interface CreatePOInput {
  code: string
  expected_delivery: string
  line_items: CreateLineItemInput[]
}

// ── Production Plans ─────────────────────────────────────────────────────────

export type PlanStatus = 'DRAFT' | 'APPROVED' | 'CANCELED'

export interface PlanItem {
  id: string
  plan_id: string
  sku_id: string
  sku_code?: string
  sku_name?: string
  quantity: number
}

export interface ProductionPlan {
  id: string
  po_id: string
  po_code?: string
  status: PlanStatus
  deadline?: string
  created_at: string
  items: PlanItem[]
}

export interface CreatePlanInput {
  po_id: string
  deadline?: string
  items: { sku_id: string; quantity: number }[]
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
  /** Required cut dimensions from the SKU — JSON key matches backend sku_dimensions */
  sku_dimensions?: { length_mm: number; width_mm: number }
  quantity: number
  status: WorkOrderStatus
  /** Optional assignee — null when no worker is assigned */
  assigned_to?: string | null
  assigned_at?: string | null
  estimated_hours?: number | null
  machine_slot_id?: string | null
  created_at: string
}

/** POST /api/v1/work-orders */
export interface CreateWOInput {
  plan_id: string
  sku_id: string
  quantity: number
  /**
   * Optional planner note recorded on the REMNANT_BYPASSED audit row when the
   * work order is created without allocating any of the fitting remnant
   * suggestions (BR-K05). Sent only when the planner confirmed the bypass via
   * the confirmation dialog.
   */
  bypass_reason?: string
}

/** POST /api/v1/work-orders/:id/advance */
export interface AdvanceStatusInput {
  status: WorkOrderStatus
  /**
   * Optional: select material when advancing PLANNED → IN_CUTTING.
   * Worker kiosk will later filter lots/sheets by this material.
   */
  material_id?: string
}

/** POST /api/v1/work-orders/:id/assign */
export interface AssignWorkOrderInput {
  user_id: string
}

/** POST /api/v1/work-orders/:id/suggest-assignment */
export interface SuggestAssignmentResult {
  user_id: string
  username?: string | null
  full_name?: string | null
  in_cutting_count: number
}

/** POST /api/v1/work-orders/:id/consumptions */
export interface AddConsumptionInput {
  material_id: string
  material_type: MaterialType
  quantity: number
  unit: string
}

/** GET /api/v1/work-orders/:id/consumptions */
export interface ConsumptionRecord {
  id: string
  work_order_id: string
  material_id: string
  material_type: MaterialType
  quantity: number
  unit: string
  created_at: string
}

// ── Labor entries (Pillar C — Actual Costing) ───────────────────────────────

export type LaborStage = 'CNC' | 'GRINDING' | 'ASSEMBLY' | 'POLISHING'

/** GET /api/v1/work-orders/:id/labor-entries */
export interface LaborEntry {
  id: string
  work_order_id: string
  stage: LaborStage
  minutes: number
  /** Hourly rate in smallest currency unit (VND/hour). Cost = minutes * rate_per_hour / 60. */
  rate_per_hour: number
  /** Person whose time is recorded (may differ from actor when foreman logs for crew). */
  worker_id: string
  /** Recorder — the user who submitted the entry, from JWT. */
  actor_id: string
  created_at: string
}

/** POST /api/v1/work-orders/:id/labor-entries */
export interface AddLaborEntryInput {
  stage: LaborStage
  minutes: number
  rate_per_hour: number
  /** Optional; when omitted backend attributes the entry to the caller. */
  worker_id?: string
}

// ── Costing ──────────────────────────────────────────────────────────────────

/** GET /api/v1/costing  or  GET /api/v1/costing/{workOrderID} */
export interface CostingRecord {
  id: string
  work_order_id: string
  sku_id: string
  /** Added by backend #211: ESTIMATED (before cutting) or ACTUAL (after completion) */
  costing_type?: 'ESTIMATED' | 'ACTUAL'
  material_cost: Money
  auxiliary_cost: Money
  labor_cost: Money
  total_cost: Money
  finalized: boolean
  created_at: string
}

/**
 * One adjustment row applied to a finalized costing record (BR-C04).
 * Mirrors backend `costing.CostingAdjustment` exactly.
 *
 * Adjustments never mutate the underlying record — the record numbers stay
 * immutable; effective totals = record + Σ deltas.
 */
export interface CostingAdjustment {
  id: string
  costing_record_id: string
  reason: string
  delta_material: Money
  delta_auxiliary: Money
  delta_labor: Money
  delta_total: Money
  /** UUID of the user who created the adjustment (auditor field). */
  created_by: string
  created_at: string
}

/**
 * GET /api/v1/costing/:workOrderID/detail — bundles the immutable record with
 * its adjustments and the running effective totals (record + Σ deltas).
 * Mirrors backend `costing.CostingRecordDetail`.
 */
export interface CostingRecordDetail {
  record: CostingRecord
  adjustments: CostingAdjustment[]
  effective_material: Money
  effective_auxiliary: Money
  effective_labor: Money
  effective_total: Money
}

/** POST /api/v1/costing/:workOrderID/adjustments */
export interface CreateAdjustmentInput {
  reason: string
  delta_material: Money
  delta_auxiliary: Money
  delta_labor: Money
}

/**
 * GET /api/v1/costing/waste-report — one row per material aggregated over the
 * filter range. Mirrors backend `costing.WasteReportRow` (BR-C03 ledger).
 */
export interface WasteReportRow {
  material_id: string
  material_name: string
  sheets_consumed: number
  /** Total waste area in mm² across the range. Display in m² (÷ 1_000_000). */
  waste_area_mm2: number
  /** Mean board-sheet cost across the consumed sheets — used by BE to allocate. */
  avg_sheet_cost: Money
  total_waste_cost: Money
}

export interface WasteReportFilter {
  /** Inclusive day in Asia/Ho_Chi_Minh; format YYYY-MM-DD. */
  from?: string
  /** Inclusive day; BE adds +1 day server-side to make it half-open. */
  to?: string
  material_id?: string
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
  /**
   * BR-K02 (BE #247 / #263): exactly one of `remnant_dimension` or
   * `is_waste: true` must be present. Send `is_waste: true` when the worker
   * picks "Hao hụt toàn bộ" so BE knows the cut intentionally produced no
   * remnant — without this the request is rejected with 400.
   */
  is_waste?: boolean
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
  location: StorageLocation | null
  rank: number
}

export interface SuggestAllocationInput {
  workOrderId: string
  requiredDimensions: { lengthMm: number; widthMm: number }[]
}

export interface SuggestAllocationResponse {
  suggestions: RemnantSuggestion[]
}

// ── Barcode ──────────────────────────────────────────────────────────────────

/** POST /api/proxy/barcodes — mirrors backend barcode.GenerateBarcodeInput */
export interface GenerateBarcodeInput {
  work_order_id: string
  sku_id: string
  po_id: string
  production_plan_id: string
  sku_code: string
  sku_name: string
  dimensions: string
  produced_date: string
}

/** GET /api/proxy/barcodes/:id — mirrors backend barcode.Barcode */
export interface BarcodeRecord {
  id: string
  work_order_id: string
  sku_id: string
  po_id: string
  production_plan_id: string
  sku_code: string
  sku_name: string
  /** Free-text dimensions string, e.g. "800x600mm" */
  dimensions: string
  produced_date: string
  created_at: string
}

/** POST /api/proxy/barcodes/:id/scans — mirrors backend barcode.ScanEvent */
export interface ScanEvent {
  id: string
  barcode_id: string
  checkpoint: ScanCheckpoint
  scanned_by: string
  scanned_at: string
  /** Optional metadata — omitempty in Go, may be absent in older records */
  device_id?: string
  device_name?: string
  shift?: string
}

/** Enriched response from POST /api/proxy/barcodes/:id/scans — mirrors backend barcode.ScanResult */
export interface ScanResult extends ScanEvent {
  scanned_by_name: string
}

/** Mirrors backend barcode.LabelSize. */
export type LabelSize = '50x30' | '100x70'

/** POST /api/proxy/barcodes/batch-print — mirrors backend barcode.BatchPrintInput */
export interface BatchPrintInput {
  barcode_ids: string[]
  size?: LabelSize
}

// ── Dashboard — GET /api/v1/dashboard/overview (mirrors Go dashboard.iface.go) ─

export interface RemnantKPIOutput {
  total: number
  available: number
  allocated: number
  consumed: number
  waste: number
}

export interface WholeSheetsByMaterialItem {
  material_id: string
  material_name: string
  material_type: string
  available_count: number
}

export interface KPIOutput {
  remnants: RemnantKPIOutput
  utilization_pct: number
  active_work_orders: number
  pending_costing: number
  whole_sheets_by_material?: WholeSheetsByMaterialItem[]
}

export interface RemnantTrendPoint {
  date: string
  available: number
  allocated: number
  waste: number
}

export interface CostAllocationItem {
  sku_code: string
  /** Stored as int64 in Go (VND cents or whole VND — display as-is) */
  cost: number
}

export interface MaterialUsagePoint {
  date: string
  PLYWOOD: number
  METAL: number
  ACCESSORY: number
}

export interface ChartsOutput {
  remnant_trend_7d: RemnantTrendPoint[]
  cost_allocation: CostAllocationItem[]
  material_usage: MaterialUsagePoint[]
}

export interface RecentCutItem {
  id: string
  work_order_id: string
  sku_id: string
  sku_code: string
  created_at: string
}

export interface RecentWorkOrderItem {
  id: string
  sku_code: string
  status: string
  created_at: string
}

export interface RecentCostingFinalizationItem {
  work_order_id: string
  sku_code: string
  total_cost: number
  created_at: string
}

export interface RecentActivityOutput {
  recent_cuts: RecentCutItem[]
  completed_work_orders: RecentWorkOrderItem[]
  costing_finalizations: RecentCostingFinalizationItem[]
}

export interface OverviewOutput {
  kpi: KPIOutput
  charts: ChartsOutput
  recent_activity: RecentActivityOutput
}

// ── Dashboard (legacy — kept for type compatibility) ─────────────────────────

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

// ── BOM Variants (dynamic substitution) ──────────────────────────────────────

/** GET /api/v1/skus/:id/variants item */
export interface BOMVariant {
  id: string
  sku_id: string
  variant_code: string
  name: string
  is_default: boolean
  created_at: string
}

/** POST /api/v1/skus/:id/variants */
export interface CreateBOMVariantInput {
  variant_code: string
  name: string
  components: BOMItem[]
}

// ── Users ───────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'cnc'
  | 'planner'
  | 'warehouse'
  | 'accountant'
  | 'cnc_manager'
  | 'foreman'

/** GET /api/proxy/admin/users */
export interface User {
  id: string
  username: string
  role: UserRole
  full_name?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

/** POST /api/proxy/admin/users */
export interface CreateUserInput {
  username: string
  password: string
  role: UserRole
  full_name?: string
  email?: string
}

/** PUT /api/proxy/admin/users/:id */
export interface UpdateUserInput {
  role: UserRole
  full_name?: string
  email?: string
}

// ── Audit log ────────────────────────────────────────────────────────────────

export type AuditLogAction =
  | 'REMNANT_BYPASSED'
  | 'OVERFLOW_BYPASSED'
  | 'TRANSFER'
  | 'ADJUSTMENT'

/** Mirrors backend `inventory.AuditLogEntry`. */
export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  actor_id: string
  from_location?: string | null
  to_location?: string | null
  from_status?: string | null
  to_status?: string | null
  reason?: string | null
  session_id?: string | null
  metadata?: unknown
  created_at: string
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

/**
 * Matches the Go backend httpkit.CursorResult[T] envelope (keyset pagination).
 * `next_cursor` is opaque — FE round-trips it as `?cursor=...` and never parses.
 */
export interface CursorResult<T> {
  items: T[]
  next_cursor: string
  has_more: boolean
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

export interface UserListParams extends PageParams {
  role?: string // comma-separated
  is_active?: boolean
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}

// ── Material Purchase Orders (Purchasing) ────────────────────────────────────

export type MPOStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface MPOItem {
  id: string
  po_id: string
  material_id: string
  material_type: string
  quantity: number
  length_mm: number
  width_mm: number
  unit_cost: Money
  total_cost: Money
  created_at: string
}

export interface MaterialPurchaseOrder {
  id: string
  code: string
  supplier?: string
  status: MPOStatus
  note?: string
  items?: MPOItem[]
  created_at: string
  ordered_at?: string
  received_at?: string
}

export interface CreateMPOInput {
  code: string
  supplier?: string
  note?: string
}

export interface AddMPOItemInput {
  material_id: string
  material_type: string
  quantity: number
  length_mm: number
  width_mm: number
  unit_cost: Money
}

export interface MPOFilter extends PageParams {
  status?: MPOStatus
  material_id?: string
  /** Inclusive ISO date (YYYY-MM-DD) lower bound on `created_at`. */
  from?: string
  /** Inclusive ISO date (YYYY-MM-DD) upper bound on `created_at`. */
  to?: string
}

// ── WIP Pipeline (dashboard) ─────────────────────────────────────────────────

export interface WIPPipelineEntry {
  status: WorkOrderStatus
  count: number
  /** ISO timestamp of the oldest started_at in this stage, null if none */
  oldest_started_at: string | null
  /** WOs whose expected_completion < now + 2 days and not yet COMPLETED */
  at_risk_count: number
}

export interface WIPPipelineOutput {
  stages: WIPPipelineEntry[]
}
