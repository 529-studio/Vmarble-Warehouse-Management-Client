---
name: remnant-flow-domain
description: Use when implementing any feature related to remnant tracking, allocation, cutting records, costing, overflow alerts, or barcode/QR. Provides the business rules and API endpoints without requiring you to read the docs.
---

# Remnant Flow Domain Knowledge

This system manages the "Remnant Flow" (Dòng chảy Vật tư dư) in a woodworking furniture workshop. Raw board sheets are CNC-cut into WIP products; leftover pieces become **remnants** tracked through the system.

---

## Core entities

| Entity | Key fields | Notes |
|--------|-----------|-------|
| `BoardSheet` | `id`, `materialType`, `lengthMm`, `widthMm`, `thicknessMm`, `unitCost`, `status` | Raw plywood/MDF before cutting |
| `Remnant` | `id`, `parentRemnantId`, `sourceBoardSheetId`, `status`, `boundingBoxLengthMm`, `boundingBoxWidthMm`, `binLocationId` | Leftover material |
| `WorkOrder` | `id`, `sku`, `requiredLengthMm`, `requiredWidthMm`, `status` | Single cutting task |
| `StorageLocation` | `id`, `zone`, `rack`, `shelf`, `barcode` | Physical bin location (e.g. A1-R2-S3) |

All types are defined in `src/types/api.ts`.

---

## Remnant lifecycle

```
AVAILABLE ──allocate()──→ ALLOCATED ──consumed by cut──→ CONSUMED
    │
    └──markWaste()──→ WASTE
```

**State meanings (match backend `domain.RemnantStatus` exactly):**
- `AVAILABLE` — ready to be allocated or cut
- `ALLOCATED` — reserved for a work order (locked)
- `CONSUMED` — fully cut, no longer in inventory
- `WASTE` — marked as unusable waste

**Never display `CONSUMED` or `WASTE` remnants in the available inventory UI.**

---

## Attribute inheritance (Sprint 2)

When a remnant is produced from a cut, it automatically inherits from its source:
- `supplierCode` → from board sheet or parent remnant
- `lotBatch` → same
- `grainPattern` → same
- `qualityGrade` → same
- `materialType` → same

The `boundingBoxLengthMm` and `boundingBoxWidthMm` represent the smallest axis-aligned rectangle that fits the usable area (not the actual ragged shape).

---

## Nested cutting (lineage chain)

A remnant can itself be cut, producing child remnants:

```
BoardSheet ─── RecordCut ──→ WIP Products
                           └→ Remnant A (parentRemnantId: null, sourceBoardSheetId: BS-01)
                                  │
                              RecordCut
                                  │
                                  └→ WIP Products
                                   └→ Remnant A.1 (parentRemnantId: A, sourceBoardSheetId: BS-01)
                                         │
                                     RecordCut
                                         └→ Remnant A.1.1 (parentRemnantId: A.1, ...)
```

**Area conservation rule**: at every cut, `used_area + remnant_area + waste_area = source_area`. The Go backend enforces this with `BR-K03`.

---

## Best Fit + FIFO allocation algorithm

When suggesting a remnant for a work order:

```
fit_score  = required_area / bounding_box_area   // 1.0 = perfect fit, lower = more waste
age_score  = days_in_stock / max_days_in_stock   // higher = older = prefer to use first

combined_score = w1 * fit_score + w2 * age_score
              = 0.6 * fit_score + 0.4 * age_score   // defaults (configurable)
```

**Display suggestion quality**: `wastePct = 1 - fit_score` → show as "% hao hụt".
A good suggestion has `wastePct ≤ 10%`.

---

## Costing rules

1. **Flat cut from board sheet**:
   `remnant_value = (remnant_area / sheet_area) * sheet_unit_cost`

2. **Nested remnant cut**:
   `remnant_value = (remnant_area / parent_remnant_area) * parent_remnant_value`

3. **Waste** is treated as overhead (absorbed by the PO) — not allocated to a specific SKU.

4. **Remnant savings** = cost avoided by using remnant instead of issuing a new sheet.

---

## Key API endpoints

These endpoints actually exist in the backend (verified against handler registrations):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/inventory/lots` | POST | Receive stock — create lot + sheets |
| `/inventory/lots` | GET | List inventory lots (paginated) |
| `/inventory/sheets` | GET | List available board sheets (paginated) |
| `/inventory/sheets/:id` | GET | Get single sheet |
| `/inventory/sheets/:id/lineage` | GET | All remnants descended from this sheet |
| `/inventory/cuts` | POST | Record a cut — creates CuttingRecord + optional Remnant |
| `/inventory/remnants` | GET | List remnants (filter: min_length_mm, min_width_mm, status) |
| `/inventory/remnants/:id/lineage` | GET | Lineage tree rooted at a remnant's parent board |
| `/inventory/remnants/:id/allocate` | POST | Allocate remnant to a work order |
| `/inventory/remnants/:id/waste` | POST | Mark remnant as WASTE |
| `/storage-locations` | GET | List all active storage locations |
| `/work-orders` | POST/GET | Create/list work orders |
| `/work-orders/:id` | GET | Get single work order |
| `/work-orders/:id/advance` | POST | Advance work order status |
| `/work-orders/:id/consumptions` | POST/GET | Record/list material consumptions |
| `/barcodes` | POST | Generate a barcode record |
| `/barcodes/:id` | GET | Lookup barcode |
| `/barcodes/:id/scans` | POST/GET | Record/list scan events |
| `/costing/:workOrderID/compute` | POST | Compute costing for a work order |
| `/costing/:workOrderID/finalize` | POST | Finalize (immutable) costing record |
| `/costing/:workOrderID` | GET | Get costing record |
| `/costing` | GET | List costing records |
| `/materials` | POST/GET | Create/list materials |
| `/skus` | POST/GET | Create/list SKUs |
| `/plans` | POST/GET | Create/list production plans |
| `/plans/:id/approve` | POST | Approve plan |
| `/plans/:id/cancel` | POST | Cancel plan |
| `/pos` | POST/GET | Create/list purchase orders |

All under base URL `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080/api/v1`).

**Endpoints that do NOT exist** (were listed incorrectly in older docs):
- ~~`/inventory/suggest-allocation`~~ — not implemented
- ~~`/inventory/overflow-status`~~ — not implemented
- ~~`/inventory/release-allocation`~~ — not implemented
- ~~`/inventory/issue-sheet`~~ — not implemented
- ~~`/remnants/:id/location`~~ — not implemented
- ~~`/dashboard/remnant-summary`~~ — not implemented
- ~~`/barcode/:id/qr`~~ — not implemented (barcodes, not barcode)
- ~~`/barcode/batch-print`~~ — not implemented

---

## Scan checkpoints (3 fixed)

| Checkpoint | Vietnamese label | When |
|------------|-----------------|------|
| `CNC_COMPLETE` | Hoàn thành CNC | After CNC machine finishes |
| `FINISHING_COMPLETE` | Hoàn thành gia công | After sanding/finishing |
| `WAREHOUSE_SHIP` | Xuất kho | When goods leave warehouse |

Use `ScannerView` on the `/scan` kiosk page to capture these.

---

## QR code content format

QR codes encode JSON:
```json
{
  "type": "REMNANT" | "WIP",
  "id": "uuid-here",
  "sku": "SKU-001",
  "dimensions": { "lengthMm": 800, "widthMm": 400, "thicknessMm": 18 },
  "lot": "LOT-2026-03",
  "location": "A1-R2-S3"
}
```

Always `JSON.parse()` the scanned string — if it fails, treat as a plain barcode ID.

---

## Work order status machine

```
PLANNED ──approve──→ IN_CUTTING ──recordCut──→ IN_PROCESSING ──finish──→ COMPLETED
```

Only `IN_CUTTING` work orders appear in the kiosk "Lệnh cắt hôm nay" screen.
Filter: `cuttingOrdersApi.list({ status: 'IN_CUTTING' })`.
