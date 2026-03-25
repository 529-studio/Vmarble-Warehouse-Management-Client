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
AVAILABLE ──allocate()──→ ALLOCATED ──recordCut()──→ USED
                │
                └──auto-release after 24h──→ AVAILABLE

AVAILABLE ──recordCut() with no material left──→ DEPLETED
```

**State meanings:**
- `AVAILABLE` — ready to be allocated or cut
- `ALLOCATED` — reserved for a work order (locked, 24h auto-release)
- `USED` — fully consumed, no longer in inventory
- `DEPLETED` — cut down to zero usable area

**Never display `USED` or `DEPLETED` remnants in the available inventory UI.**

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

## Overflow alert

```
utilization = total_remnant_area_m2 / total_raw_stock_area_m2

GREEN:  utilization ≤ 10%   → normal
YELLOW: 10% < utilization ≤ 15% → warning
RED:    utilization > 15%   → block new sheet issuance
```

When `status === 'RED'`:
- `blockNewSheetIssue: true`
- Show sticky `AlertBanner` at top of dashboard overview
- `POST /inventory/issue-sheet` returns `422` with Vietnamese message

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

| Endpoint | Method | When to call |
|----------|--------|-------------|
| `/remnants` | GET | List available remnants (filter by size, material, status) |
| `/remnants/:id/lineage` | GET | Show parent/child tree for a remnant |
| `/inventory/suggest-allocation` | POST | Get Best Fit + FIFO suggestions for a work order |
| `/inventory/allocate` | POST | Lock a remnant for 24h |
| `/inventory/release-allocation` | POST | Manually release a locked remnant |
| `/inventory/record-cut` | POST | Record a completed cut (creates remnant + barcode) |
| `/inventory/overflow-status` | GET | Get GREEN/YELLOW/RED status |
| `/storage-locations` | CRUD | Manage bin locations |
| `/remnants/:id/location` | PUT | Assign remnant to a bin location |
| `/barcode/:id/qr` | GET | Get QR image (PNG) |
| `/barcode/:id/label` | GET | Get printable PDF label |
| `/barcode/batch-print` | POST | Batch print multiple labels |
| `/barcode/scan` | POST | Record a checkpoint scan event |
| `/dashboard/remnant-summary` | GET | KPIs: count, area, avg age |
| `/dashboard/cutting-efficiency` | GET | Waste % by week/month |
| `/costing/reports` | GET | Cost report by PO |

All are under the base URL `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080/api/v1`).
All typed in `src/lib/api/remnants.ts`, `cutting-orders.ts`, `barcode.ts`, `dashboard.ts`.

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
