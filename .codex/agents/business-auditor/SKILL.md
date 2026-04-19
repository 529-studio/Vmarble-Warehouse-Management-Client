---
name: business-auditor
description: Use to verify if UI/UX and Frontend logic reflect the Vietnamese business rules.
---

# Business Auditor - UI & UX Validation (Frontend)

Ensures the user flow and interface comply with `docs/backend-business-logic-vi.md`.

## Core Principles
1. **Terminology**: Use precise Vietnamese workshop terms (tấm lẻ, phôi, lệnh cắt, hao hụt, vị trí kho).
2. **State Logic**: UI must reflect business states (e.g., `CONSUMED` remnants must not appear in `AVAILABLE` lists).

## Audit Workflow

### 1. Terminology Audit
Ensure standard terms are used across all pages:
- `Remnant` -> "Tấm lẻ"
- `WorkOrder` -> "Lệnh cắt"
- `BoardSheet` -> "Tấm nguyên"
- `Bin Location` -> "Vị trí kho"

### 2. UI Constraint Check
- **BR-K01/K05**: When reporting a cut, FE must provide inputs for `boundingBoxLengthMm` and `boundingBoxWidthMm`.
- **Overflow Alerts**: Verify the color logic (Red/Green) for remnant area utilization percentages.

### 3. Integrated Validation
- Before calling `recordCut` API, the FE should perform basic "Pre-checks" (e.g., dimensions must be positive numbers).

## Pre-PR Checklist
- [ ] Are all labels in correct Vietnamese?
- [ ] Does the scan flow follow the correct sequence (Scan Material -> Scan Location)?
- [ ] Is there an Alert Banner for significant area loss (>15% overflow)?
