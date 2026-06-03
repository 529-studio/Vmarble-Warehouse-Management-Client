---
name: business-auditor
description: >
  Use to verify whether UI/UX and frontend logic reflect the business rules. Always invoke this skill during the "Làm task tiếp theo" / "Start next task" automation flow after selecting an issue: read docs/backend-business-logic-en.md (primary, v2.0 Container-flow pivot) and docs/backend-business-logic-vi.md (Vietnamese terms), identify every touched BR-* rule, map required states/validations/terminology, and block implementation if any relevant business rule is unclear.
---

# Business Auditor - UI & UX Validation (Frontend)

Ensure the user flow and interface comply with the business rules.

## Primary sources (read both)

1. **`docs/backend-business-logic-en.md`** — authoritative English spec, v2.0, post Demo-1 pivot (Container-flow). This is the current source of truth for flow, entities, modules, and BR-* rules.
2. **`docs/backend-business-logic-vi.md`** — Vietnamese version; use for UI terminology and label wording.

> When there is a conflict between the two documents, `backend-business-logic-en.md` takes precedence.

## Domain context (post-Demo-1 pivot)

The core business axis is now **Container-flow**: `SO → FG Pool → Container → Packing List`.
- New modules since Sprint 6: `sales`, `delivery`, `packing`, `scrap`, `loading_exception`
- Loading exception types: `SHORT_SHIPPED`, `OVER_LOADED`, `WRONG_SKU`, `SUBSTITUTION`, `DAMAGED_AT_LOADING`, `UNPLANNED_UNIT`, `CUSTOMER_CHANGE`
- Container lifecycle: `OPEN → LOADING → SEALED → SHIPPED` + `CANCELLED`
- FG Pool: `AVAILABLE → RESERVED → LOADED → DEFECT`
- SEAL guard: cannot seal when pending exceptions exist or OVER row has no approved exception

## Core principles
1. Use precise Vietnamese workshop terms: tấm lẻ, phôi, lệnh cắt, hao hụt, vị trí kho, container, thành phẩm, đơn hàng.
2. Ensure UI states mirror business states exactly (no extra/missing states).
3. Treat unclear business rules as blockers, not assumptions.

## Audit workflow

### 1. Read the task before auditing
Start from the full issue body or selected board item, not just the title.

### 2. Cross-reference business rules
Read both business logic documents and list every touched `BR-*` rule.

For each touched rule, capture:
- Rule ID
- What user action or screen it affects
- Required validation or state transition
- Any UI copy or terminology constraints
- Any ambiguity that prevents safe implementation

### 3. Terminology audit
Ensure standard terms are used across the impacted pages:
- `Remnant` → "Tấm lẻ"
- `WorkOrder` → "Lệnh sản xuất" / "Lệnh cắt"
- `BoardSheet` → "Tấm nguyên"
- `Bin Location` → "Vị trí kho"
- `Container` → "Container" (keep English — industry term)
- `SalesOrder` → "Đơn hàng khách"
- `FGPool` → "Hàng chờ xuất" / "Thành phẩm sẵn sàng"
- `LoadingException` → "Exception loading" / "Sự cố đóng hàng"
- `ScrapSale` → "Bán phế liệu"
- `MaterialRejection` → "Khiếu nại NCC"

### 4. Constraint audit
Verify that the UI exposes the business-required inputs and checks.
Examples:
- **BR-K01 / BR-K05**: when reporting a cut, FE must provide `boundingBoxLengthMm` and `boundingBoxWidthMm`
- **BR-D06**: Reopen container (SEALED→LOADING) requires admin role
- **BR-D13**: Approving a new loading plan triggers `PLAN_RELOAD` SSE → FE must invalidate plan side
- **BR-D17/D18**: SEAL blocked when pending exceptions exist
- **BR-C06**: Scrap sale revenue offsets waste cost in WasteReport → invalidate both keys
- **BR-INV05**: Claim status transitions — OPEN→APPROVED|REJECTED, APPROVED→PAID only
- Overflow alerts must match the expected utilization threshold (15%)
- Pre-submit validation must reject impossible values before calling the API

### 5. Blocking rule
If a relevant rule is missing, contradictory, or unclear, stop implementation and raise the ambiguity explicitly.
Do not guess.

## Required audit output
- Touched `BR-*` list
- Impacted screens / actions / states
- Required frontend validations
- Vietnamese terminology notes
- Explicit blocker section if anything is unclear

## Pre-PR checklist
- [ ] Are all impacted labels in correct Vietnamese?
- [ ] Does the flow follow the correct business sequence per BR-* rules?
- [ ] Are hidden business constraints enforced before mutation calls?
- [ ] Were all touched BR-* rules acknowledged somewhere in the implementation notes?
- [ ] Are RBAC gates consistent with the persona matrix (WORKER / PLANNER / ADMIN)?
