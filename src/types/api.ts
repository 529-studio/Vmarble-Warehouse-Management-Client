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

/** Backend: AVAILABLE | ALLOCATED | CONSUMED | WASTE | EXPIRED */
export type RemnantStatus = 'AVAILABLE' | 'ALLOCATED' | 'CONSUMED' | 'WASTE' | 'EXPIRED'

export type RemnantAgingLevel = 'OK' | 'AT_RISK' | 'EXPIRED'

export interface RemnantAgingRow {
  age_days?: number
  level?: RemnantAgingLevel
  remnant?: Remnant
}

export interface RemnantAgingSummary {
  warn_days?: number
  expire_days?: number
  total_ok?: number
  total_at_risk?: number
  total_expired?: number
  rows?: RemnantAgingRow[]
}

export type WorkOrderStatus =
  | 'PLANNED'
  | 'IN_CUTTING'
  | 'IN_PROCESSING'
  | 'COMPLETED'
  | 'PARTIAL_COMPLETE'
  | 'COSTED'
  | 'CANCELED'

/**
 * Reason a WO came up short. Set together with `actual_qty` when status flips
 * to PARTIAL_COMPLETE. BE source of truth: `production.PartialCompleteInput`.
 */
export type ShortfallReason =
  | 'MATERIAL_SHORTAGE'
  | 'DEFECT'
  | 'TIME_SHORTAGE'
  | 'OTHER'

export type QualityGrade = 'A' | 'B' | 'C'

export type GrainPattern = 'WITH_GRAIN' | 'CROSS_GRAIN' | 'NONE'

export type ScanCheckpoint =
  | 'CNC_COMPLETE'
  | 'QC_PASSED'
  | 'QC_FAILED'
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

/** GET /api/v1/inventory/lots */
export interface InventoryLot {
  id: string
  material_id?: string
  supplier_ref?: string
  quantity?: number
  cost_per_sheet?: Money
  received_at?: string
  is_active?: boolean
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
  /**
   * Produced count when status=PARTIAL_COMPLETE (#292). Always <= quantity.
   * Nil for any other status.
   */
  actual_qty?: number | null
  /** Why the WO came up short. Set together with actual_qty. */
  shortfall_reason?: ShortfallReason | string | null
  /**
   * When set, identifies the WO this one carried over from. Set on
   * auto-spawned carry-over WOs; nil otherwise.
   */
  parent_wo_id?: string | null
  /**
   * Links the WO back to a sales_order_lines row (Phase A pivot). Nullable
   * so legacy/PO-rooted WOs read fine without it.
   */
  sales_order_line_id?: string | null
  /** Set by BoostPriority (BR-PL05); never cleared. */
  priority_boost?: boolean
  /** Denormalized last QC result ('QC_PASSED' | 'QC_FAILED') — set by the barcode module after QC scan. */
  qc_status?: string | null
}

/**
 * POST /api/v1/work-orders/:id/report — partial-complete (#292).
 * Closes the WO with `actual_qty <= quantity` and optionally spawns a
 * carry-over WO for the shortfall.
 */
export interface PartialCompleteInput {
  /** Produced count. Must satisfy 0 <= actual_qty <= quantity. */
  actual_qty: number
  /** Required when actual_qty < quantity. */
  shortfall_reason?: ShortfallReason
  /** Free-form notes about the shortfall. */
  shortfall_detail?: string
  /** Spawn a carry-over WO for the shortfall (default true on BE). */
  carry_over?: boolean
  /** Override plan id for the carry-over WO. Defaults to source WO's plan. */
  carry_over_plan_id?: string
}

export interface PartialCompleteResult {
  /** The updated source WO (now PARTIAL_COMPLETE). */
  wo_updated?: WorkOrder
  /** The auto-spawned carry-over WO (PLANNED) when `carry_over` was true. */
  carry_over_wo?: WorkOrder
}

/** GET /api/v1/planning/work-orders/:id/check-feasibility */
export interface FeasibilitySuggestion {
  wo_id?: string
  score?: number
  freed_qty?: number
  sku_code?: string
  days_to_due?: number
}

export interface FeasibilityResult {
  feasible?: boolean
  reason?: string
  suggestions?: FeasibilitySuggestion[]
}

/** POST /api/v1/planning/work-orders/:id/boost-priority */
export interface BoostPriorityResult {
  audit_id?: string
  boosted_at?: string
}

/** GET /api/v1/planning/work-orders/:id/preempt-candidates */
export interface PreemptCandidate {
  wo_id?: string
  freed_qty?: number
  slack_days?: number
  status?: string
  current_so_code?: string
}

/** POST /api/v1/planning/work-orders/:id/preempt */
export interface PreemptResult {
  audit_id?: string
  freed_qty?: number
  preempted_at?: string
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
  /**
   * Revenue collected from scrap sales for this material in the same range
   * (BR-C06). Subtracted from `total_waste_cost` to produce `net_waste_cost`.
   */
  scrap_sale_revenue: Money
  /**
   * `total_waste_cost − scrap_sale_revenue`. May be negative when scrap sales
   * exceed waste — display sign in the UI.
   */
  net_waste_cost: Money
}

export interface WasteReportFilter {
  /** Inclusive day in Asia/Ho_Chi_Minh; format YYYY-MM-DD. */
  from?: string
  /** Inclusive day; BE adds +1 day server-side to make it half-open. */
  to?: string
  material_id?: string
}

// ── Scrap sales (BR-C05/C06/C08) ────────────────────────────────────────────

/**
 * GET /api/v1/scrap-sales item — mirrors backend `scrap.ScrapSale`.
 * Phase A: BE accepts only VND on create; reads still surface `currency` so
 * legacy rows stay readable when multi-currency lands (#295).
 */
export interface ScrapSale {
  id: string
  material_id: string
  /** Inclusive day in Asia/Ho_Chi_Minh; format YYYY-MM-DD. */
  sale_date: string
  /** Kilograms — BE stores as decimal; FE shows ≤ 2 decimal places. */
  quantity_kg: number
  /** Per-kg price in the smallest unit of `currency` (VND đồng). */
  unit_price: number
  /** Pre-computed `quantity_kg * unit_price` from BE. */
  total_amount: number
  currency: string
  buyer_name: string
  invoice_number?: string
  notes?: string
  created_by: string
  created_at: string
}

/** POST /api/v1/scrap-sales — mirrors backend `scrap.CreateScrapSaleInput`. */
export interface CreateScrapSaleInput {
  material_id: string
  /** YYYY-MM-DD; must not be in the future. */
  sale_date: string
  quantity_kg: number
  unit_price: number
  /** Phase A: must be 'VND'. */
  currency: string
  buyer_name: string
  invoice_number?: string
  notes?: string
}

export interface ScrapSalesFilter {
  cursor?: string | null
  limit?: number
  /** YYYY-MM-DD inclusive. */
  from?: string
  /** YYYY-MM-DD inclusive (BE adds +1 day server-side). */
  to?: string
  material_id?: string
}

// ── Material rejections (BR-INV02–06) ───────────────────────────────────────

/** Mirrors backend `inventory.MaterialRejection.claim_status`. */
export type ClaimStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'PAID'

export const CLAIM_STATUSES: ClaimStatus[] = ['OPEN', 'APPROVED', 'REJECTED', 'PAID']

/**
 * GET /api/v1/inventory/material-rejections item — mirrors backend
 * `inventory.MaterialRejection`. Created by the BE's RejectLot flow; FE only
 * lists, reads, and patches claim status (BR-INV05 transitions).
 */
export interface MaterialRejection {
  id: string
  lot_id: string
  reason_code: string
  reason_detail?: string
  rejected_qty_sheets: number
  photo_urls?: string[]
  /** Plain number — BE keeps amount and currency separate. */
  claim_amount: number
  claim_currency: string
  claim_status: ClaimStatus | string
  resolution_notes?: string
  reported_by: string
  reported_at: string
  resolved_by?: string
  resolved_at?: string
}

/**
 * PATCH /api/v1/inventory/material-rejections/:id — mirrors backend
 * `inventory.UpdateClaimInput`. Allowed transitions per BR-INV05:
 *   OPEN → APPROVED | REJECTED
 *   APPROVED → PAID
 */
export interface UpdateClaimInput {
  claim_status: ClaimStatus | string
  /** Required when transitioning to APPROVED/PAID; ignored on REJECTED. */
  claim_amount?: number
  /** Phase A: 'VND'. */
  claim_currency?: string
  resolution_notes?: string
}

export interface MaterialRejectionsFilter {
  cursor?: string | null
  limit?: number
  claim_status?: ClaimStatus
  lot_id?: string
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

/** GET /api/v1/work-orders/:id/qc-history — mirrors backend barcode.QCEvent */
export interface QCEvent {
  id?: string
  barcode_id?: string
  scan_event_id?: string
  work_order_id?: string
  result?: ScanCheckpoint
  note?: string
  scanned_by?: string
  created_at?: string
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
 * `total` is a best-effort count; when `total_is_estimate=true` it is an estimate
 * and should be rendered with a `~` prefix.
 */
export interface CursorResult<T> {
  items: T[]
  next_cursor: string
  has_more: boolean
  total: number
  total_is_estimate: boolean
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

// ── Delivery / Containers (pivot Phase A) ────────────────────────────────────

export type ContainerStatus =
  | 'OPEN'
  | 'LOADING'
  | 'SEALED'
  | 'SHIPPED'
  | 'CANCELLED'

export const CONTAINER_STATUSES: ContainerStatus[] = [
  'OPEN',
  'LOADING',
  'SEALED',
  'SHIPPED',
  'CANCELLED',
]

/** Mirrors backend `delivery.Container`. */
export interface Container {
  id: string
  code: string
  container_type: string
  status: ContainerStatus
  max_cbm: number
  max_payload_kg: number
  used_cbm: number
  used_weight_kg: number
  fill_pct_cbm: number
  fill_pct_mass: number
  note: string | null
  sealed_at: string | null
  sealed_by: string | null
  vessel_id?: string | null
  /** UUID of the loader assigned to physically load this container. */
  loader_id?: string | null
  created_by: string
  created_at: string
  /** Only hydrated by GET /containers/:id, not by list. */
  lines?: ContainerLine[]
}

/** Mirrors backend `delivery.ContainerLine`. */
export interface ContainerLine {
  id: string
  container_id: string
  sales_order_line_id: string
  sku_id: string
  sku_code: string
  sku_name: string
  qty: number
  cbm_total: number
  weight_kg_total: number
  added_by: string
  added_at: string
}

export interface ContainersFilter extends PageParams {
  search?: string
  status?: ContainerStatus
  container_type?: string
  loader_id?: string
}

/** Mirrors backend `delivery.AtRiskRow`. GET /api/v1/containers/at-risk */
export interface AtRiskRow {
  id?: string
  code?: string
  vessel_name?: string
  cutoff_date?: string
  days_to_cutoff?: number
  fill_pct_cbm?: number
  used_cbm?: number
  max_cbm?: number
  line_count?: number
  /** "RED" | "ORANGE" */
  risk_level?: string
}

/** POST /api/v1/containers/:id/assign-loader — BR-D21/D22/D23. */
export interface AssignLoaderInput {
  /** nil = unassign */
  loader_id?: string | null
  /** Required when reassigning a different loader (BR-D22). */
  reason?: string
}

/** GET /api/v1/containers/:id/loader-log */
export interface ContainerLoaderLog {
  id?: string
  container_id?: string
  from_loader_id?: string | null
  to_loader_id?: string | null
  assigned_by?: string
  assigned_at?: string
  reason?: string
}

// ── Sales Orders ────────────────────────────────────────────────────────────

// ── Sales Orders ────────────────────────────────────────────────────────────

export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'CANCELLED'

/** Mirrors backend `sales.SalesOrderLine`. */
export interface SalesOrderLine {
  id: string
  sales_order_id: string
  sku_id: string
  qty_ordered: number
  qty_planned: number
  qty_shipped: number
  unit_price?: Money
  created_at: string
}

/** Mirrors backend `sales.SalesOrder`. */
export interface SalesOrder {
  id: string
  code: string
  status: SalesOrderStatus | string
  customer_id: string
  customer_code?: string
  customer_name?: string
  customer_country_code?: string
  currency?: string
  incoterm?: string
  port_of_loading?: string
  port_of_discharge?: string
  expected_ship_date?: string
  note?: string
  created_by?: string
  created_at: string
  /** Hydrated by GET /sales-orders/:id and (optionally) by list. */
  lines?: SalesOrderLine[]
}

export interface SalesOrdersFilter extends PageParams {
  status?: SalesOrderStatus
  customer_id?: string
}

// ── Packing (FG pool + defect reporting) ────────────────────────────────────

/** BE FGPool.status enum: AVAILABLE | RESERVED | LOADED | DEFECT. */
export type FGPoolStatus = 'AVAILABLE' | 'RESERVED' | 'LOADED' | 'DEFECT' | string

/** Mirrors backend `packing.FGPool`. */
export interface FGPool {
  id: string
  barcode_id: string
  sku_id: string
  sku_code: string
  sku_name: string
  work_order_id: string
  sales_order_line_id?: string
  container_line_id?: string
  status: FGPoolStatus
  qc_passed_at?: string
  qc_passed_by?: string
  created_at: string
}

/** Suggestion shown after a successful scan — best-fit OPEN/LOADING containers. */
export interface PackingContainerSuggestion {
  container_id: string
  code: string
  container_type: string
  status: string
  fill_pct_cbm: number
  fill_pct_mass: number
}

/** Result of POST /packing/scan. */
export interface PackingScanResult {
  fg: FGPool
  suggested_containers?: PackingContainerSuggestion[]
  /** Status of the parent work order — useful when the FG cannot ship yet. */
  wo_status?: string
}

/**
 * Defect reason. The BE accepts a free-form string; the kiosk pins worker to
 * a fixed shortlist so reports are aggregable. `OTHER` lets them escape into
 * `detail` when the shortlist does not fit.
 */
export type DefectReason =
  | 'CRACK'
  | 'SCRATCH'
  | 'COLOR_OFF'
  | 'WRONG_SIZE'
  | 'OTHER'

/** Body for POST /packing/defect (`packing.ReportDefectInput`). */
export interface ReportDefectInput {
  barcode_id: string
  reason: DefectReason | string
  detail?: string
  photo_urls?: string[]
}

/** Mirrors backend `packing.FGDefect`. */
export interface FGDefect {
  id: string
  fg_pool_id: string
  reason: string
  detail?: string
  photo_urls?: string[]
  detected_by: string
  detected_at: string
  resolution?: string
  resolved_by?: string
  resolved_at?: string
  note?: string
}

export interface FGPoolFilter extends PageParams {
  sku_id?: string
  status?: FGPoolStatus
  sales_order_line_id?: string
}

/** Body for POST /fg-pool/:id/reassign. */
export interface ReassignFGInput {
  new_sales_order_line_id: string
  reason: string
}

/** Mirrors backend `packing.FGReassignHistory`. */
export interface FGReassignHistory {
  id: string
  fg_pool_id: string
  old_sales_order_line_id: string | null
  new_sales_order_line_id: string
  reason: string
  reassigned_by: string
  reassigned_at: string
}

// ── Customers ────────────────────────────────────────────────────────────────

/** Mirrors backend `sales.Customer`. */
export interface Customer {
  id: string
  code: string
  name: string
  contact_person?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  country_code?: string
  is_active: boolean
  created_at: string
}

export interface CustomersFilter extends PageParams {
  search?: string
  is_active?: boolean
}

// ── Loading Plans (Excel packing-list upload) ────────────────────────────────

/**
 * Loading plan lifecycle:
 *   PARSED   → fresh upload, before approve. Container can have at most one.
 *   APPROVED → version locked, drives reconciliation. Worker scans against this.
 *   SUPERSEDED → replaced by a newer APPROVED version (v2 re-upload).
 */
export type LoadingPlanStatus = 'PARSED' | 'APPROVED' | 'SUPERSEDED'

/** Mirrors backend `delivery.LoadingPlan`. */
export interface LoadingPlan {
  id: string
  container_id: string
  status: LoadingPlanStatus | string
  version: number
  excel_file_url?: string
  excel_hash?: string
  notes?: string
  parsed_at?: string
  approved_at?: string | null
  approved_by?: string | null
  superseded_at?: string | null
  superseded_by?: string | null
  uploaded_by?: string
  created_at: string
  lines?: LoadingPlanLine[]
}

/** Mirrors backend `delivery.LoadingPlanLine`. */
export interface LoadingPlanLine {
  id: string
  loading_plan_id: string
  excel_row_num: number
  customer_sku_code: string
  sku_id?: string
  qty_in_excel: number
  unit_in_excel: string
  qty_planned_pieces: number
  raw_excel_row?: unknown[]
  created_at: string
}

/** Mirrors backend `delivery.LoadingPlanRowError`. Used in 400/422 upload responses. */
export interface LoadingPlanRowError {
  row: number
  col?: string
  code: string
  message: string
}

/** Mirrors backend `delivery.LoadingPlanUploadResult`. */
export interface LoadingPlanUploadResult {
  plan?: LoadingPlan | null
  lines?: LoadingPlanLine[]
  errors?: LoadingPlanRowError[]
  warnings?: LoadingPlanRowError[]
}

export interface ApproveLoadingPlanInput {
  confirm_supersede?: boolean
  notes?: string
}

/** Mirrors backend `delivery.LoadingPlanLineDiff`. */
export interface LoadingPlanLineDiff {
  sku_id?: string
  customer_sku_code?: string
  old_qty: number
  new_qty: number
}

/** Mirrors backend `delivery.LoadingPlanDiff`. */
export interface LoadingPlanDiff {
  new_plan: string
  against: string
  added: LoadingPlanLine[]
  removed: LoadingPlanLine[]
  changed: LoadingPlanLineDiff[]
}

// ── Loading Exceptions (BE #303) ─────────────────────────────────────────────

export const LOADING_EXCEPTION_TYPES = [
  'SHORT_SHIPPED',
  'OVER_LOADED',
  'WRONG_SKU',
  'SUBSTITUTION',
  'DAMAGED_AT_LOADING',
  'UNPLANNED_UNIT',
  'CUSTOMER_CHANGE',
] as const
export type LoadingExceptionType = (typeof LOADING_EXCEPTION_TYPES)[number]

export const LOADING_EXCEPTION_RESOLUTIONS = [
  'BACKORDER',
  'CANCEL_FROM_SO',
  'SUBSTITUTE_ACCEPTED',
  'WRITE_OFF',
  'DEFER_TO_NEXT',
] as const
export type LoadingExceptionResolution =
  (typeof LOADING_EXCEPTION_RESOLUTIONS)[number]

/**
 * Mirrors backend `loading_exception.LoadingException`.
 *
 * `approved_by` NULL means the exception is still pending and blocks SEAL
 * (BR-D17/D18). Once stamped (approve OR reject), SEAL no longer treats it
 * as a blocker; `resolution` is set on approve and stays NULL on reject.
 */
export interface LoadingException {
  id: string
  container_id: string
  loading_plan_id?: string
  exception_type: LoadingExceptionType | string
  sku_id?: string
  qty?: number
  reason: string
  photo_urls?: string[]
  resolution?: LoadingExceptionResolution | string | null
  resolution_notes?: string | null
  substitute_sku_id?: string | null
  carry_over_so_line_id?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_at: string
  created_by: string
}

export interface CreateLoadingExceptionInput {
  exception_type: LoadingExceptionType | string
  loading_plan_id?: string
  sku_id?: string
  so_line_id?: string
  qty?: number
  reason: string
  photo_urls?: string[]
}

export interface ApproveLoadingExceptionInput {
  resolution: LoadingExceptionResolution | string
  resolution_notes?: string
  substitute_sku_id?: string
  parent_so_line_id?: string
}

export interface RejectLoadingExceptionInput {
  reason: string
}

/** Mirrors backend `loading_exception.bulkApproveRequest`. */
export interface BulkApproveLoadingExceptionsInput {
  ids: string[]
  /**
   * Per BE: BACKORDER and SUBSTITUTE_ACCEPTED are rejected here because they
   * require per-row context (parent_so_line_id / substitute_sku_id).
   */
  resolution: LoadingExceptionResolution | string
  resolution_notes?: string
}

export const BULK_APPROVE_FAILURE_CODES = [
  'NOT_FOUND',
  'INVALID_TRANSITION',
  'INVALID_INPUT',
  'PRECONDITION_FAILED',
  'INTERNAL',
] as const
export type BulkApproveFailureCode = (typeof BULK_APPROVE_FAILURE_CODES)[number]

export interface BulkApproveFailed {
  id: string
  code: BulkApproveFailureCode | string
  message: string
}

export interface BulkApproveResult {
  approved: string[]
  failed: BulkApproveFailed[]
}

/** Mirrors backend `loading_exception.CrossContainerSummary`. */
export interface LoadingExceptionsSummary {
  pending_count: number
  blocked_containers: number
}

// ── Vessels (shipping schedule) ───────────────────────────────────────────────

/** Mirrors backend `shipping.Vessel`. */
export interface Vessel {
  id: string
  name: string
  voyage_number: string
  etd: string
  eta: string
  port_of_loading: string
  port_of_discharge: string
  cutoff_date: string
  note?: string | null
  created_by?: string
  created_at: string
}

export interface VesselsFilter extends PageParams {
  search?: string
}

export interface CreateVesselInput {
  name: string
  voyage_number: string
  etd: string
  eta: string
  port_of_loading: string
  port_of_discharge: string
  cutoff_date: string
  note?: string
}

export interface UpdateVesselInput {
  name?: string
  voyage_number?: string
  etd?: string
  eta?: string
  port_of_loading?: string
  port_of_discharge?: string
  cutoff_date?: string
  note?: string
}
