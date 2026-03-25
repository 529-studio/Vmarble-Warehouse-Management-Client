// ---------------------------------------------------------------------------
// API DTOs — mirrors the Go backend types from internal/module/*/iface.go
// ---------------------------------------------------------------------------

// ── Shared ──────────────────────────────────────────────────────────────────

export type MaterialType = 'PLYWOOD' | 'MDF' | 'HDF' | string

export type RemnantStatus = 'AVAILABLE' | 'ALLOCATED' | 'USED' | 'DEPLETED'

export type WorkOrderStatus =
  | 'PLANNED'
  | 'IN_CUTTING'
  | 'IN_PROCESSING'
  | 'COMPLETED'

export type QualityGrade = 'A' | 'B' | 'C'

export type GrainPattern = 'WITH_GRAIN' | 'CROSS_GRAIN' | 'NONE'

export type ScanCheckpoint =
  | 'CNC_COMPLETE'
  | 'FINISHING_COMPLETE'
  | 'WAREHOUSE_SHIP'

// ── Inventory ───────────────────────────────────────────────────────────────

export interface BoardSheet {
  id: string
  supplierCode: string
  lotBatch: string
  materialType: MaterialType
  grainPattern: GrainPattern
  qualityGrade: QualityGrade
  lengthMm: number
  widthMm: number
  thicknessMm: number
  unitCost: number
  status: 'AVAILABLE' | 'IN_USE' | 'DEPLETED'
  createdAt: string
}

export interface Remnant {
  id: string
  parentRemnantId: string | null
  sourceBoardSheetId: string | null
  supplierCode: string
  lotBatch: string
  materialType: MaterialType
  grainPattern: GrainPattern
  qualityGrade: QualityGrade
  actualLengthMm: number
  actualWidthMm: number
  thicknessMm: number
  boundingBoxLengthMm: number
  boundingBoxWidthMm: number
  status: RemnantStatus
  binLocationId: string | null
  binLocation?: StorageLocation
  allocatedToWoId: string | null
  allocatedAt: string | null
  daysInStock: number
  createdAt: string
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

export interface WorkOrder {
  id: string
  planId: string
  sku: string
  quantity: number
  materialType: MaterialType
  requiredLengthMm: number
  requiredWidthMm: number
  status: WorkOrderStatus
  assignedBoardSheetId: string | null
  assignedRemnantId: string | null
  createdAt: string
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

export interface RecordCutInput {
  workOrderId: string
  usedLengthMm: number
  usedWidthMm: number
  remnantLengthMm?: number
  remnantWidthMm?: number
  isWaste: boolean
  operatorId: string
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

// ── Costing ──────────────────────────────────────────────────────────────────

export interface CostingReport {
  poId: string
  poCode: string
  items: CostingItem[]
  totalMaterialCost: number
  totalWasteCost: number
  totalRemnantSavings: number
}

export interface CostingItem {
  sku: string
  quantity: number
  materialCost: number
  wasteCostAllocation: number
  remnantSavings: number
  unitCost: number
}

// ── Dashboard ────────────────────────────────────────────────────────────────

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
