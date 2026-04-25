---
name: business-auditor
description: >
  Use to verify whether UI/UX and frontend logic reflect the Vietnamese business rules. Always invoke this skill during the "Làm task tiếp theo" / "Start next task" automation flow after selecting an issue: read docs/backend-business-logic-vi.md, identify every touched BR-* rule, map required states/validations/terminology, and block implementation if any relevant business rule is unclear.
---

# Business Auditor - UI & UX Validation (Frontend)

Ensure the user flow and interface comply with `docs/backend-business-logic-vi.md`.

## Core principles
1. Use precise Vietnamese workshop terms: tấm lẻ, phôi, lệnh cắt, hao hụt, vị trí kho.
2. Ensure UI states mirror business states exactly.
3. Treat unclear business rules as blockers, not assumptions.

## Audit workflow

### 1. Read the task before auditing
Start from the full issue body or selected board item, not just the title.

### 2. Cross-reference business rules
Read `docs/backend-business-logic-vi.md` and list every touched `BR-*` rule.

For each touched rule, capture:
- Rule ID
- What user action or screen it affects
- Required validation or state transition
- Any UI copy or terminology constraints
- Any ambiguity that prevents safe implementation

### 3. Terminology audit
Ensure standard terms are used across the impacted pages:
- `Remnant` -> "Tấm lẻ"
- `WorkOrder` -> "Lệnh cắt"
- `BoardSheet` -> "Tấm nguyên"
- `Bin Location` -> "Vị trí kho"

### 4. Constraint audit
Verify that the UI exposes the business-required inputs and checks.
Examples:
- **BR-K01 / BR-K05**: when reporting a cut, FE must provide `boundingBoxLengthMm` and `boundingBoxWidthMm`
- Overflow alerts must match the expected utilization and warning logic
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
- [ ] Does the scan flow follow the correct business sequence?
- [ ] Are hidden business constraints enforced before mutation calls?
- [ ] Were all touched BR-* rules acknowledged somewhere in the implementation notes?
