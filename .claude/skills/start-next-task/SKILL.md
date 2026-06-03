---
name: start-next-task
description: >
  Use when the user says "Làm task tiếp theo", "task tiếp theo", "Start next task", asks to pick the next issue, or wants to continue from a GitLab board item. Orchestrate the automation workflow: fetch the highest-priority open issue from the GitLab FE project via the product-manager workflow, read the full issue and DoD, run a business-auditor pass against docs/backend-business-logic-en.md + docs/backend-business-logic-vi.md, identify every touched BR-* rule and block if any rule is unclear, hand off to senior-workflow-frontend at Phase 1, invoke integration-architect whenever the task adds or changes an endpoint or DTO, and update docs/PROJECT-STATUS.md after the issue is closed.
---

# Start Next Task Automation

Run this workflow whenever the user asks to continue with the next task instead of naming a specific implementation target.

## Goal

Turn a vague "next task" request into a disciplined execution flow:
1. Pick the right issue.
2. Read the full requirement and DoD.
3. Audit business-rule impact before coding.
4. Start implementation from requirements clarification, not from code.
5. Enforce frontend-backend contract checks when integration changes are involved.
6. Update project status after completion.

## Workflow

### 1. Fetch the highest-priority open FE issue

Use the `product-manager` skill to identify the next issue to work on.

If the user already picked a GitLab board card or gave an issue number, skip the fetch step and use that issue directly.

Otherwise use `glab` (GitLab CLI) to list open issues assigned to the current user on the FE repo:

```bash
glab issue list --repo giangdq202/Vmarble-Warehouse-Management-Client \
  --assignee @me --state opened \
  | head -20
```

Or fetch from the BE repo when working on backend tasks:

```bash
glab issue list --repo giangdq202/Vmarble-Warehouse-Management-Service \
  --assignee @me --state opened \
  | head -20
```

> **Note:** `glab` is the GitLab equivalent of `gh`. If `glab` is not installed or auth is missing, fall back to the GitLab web UI or ask the user for the issue number/text.

### 2. Analyze the requirement

Read the complete issue body before planning implementation:

```bash
glab issue view <number> --repo giangdq202/Vmarble-Warehouse-Management-Client
```

Extract at least:
- Summary / user problem
- Definition of Done
- Route or module hints
- API or data-contract implications
- BE dependency status (are blocking BE issues merged?)
- Missing details that could block implementation

### 3. Audit business rules before coding

Invoke `business-auditor` and cross-reference the issue against **both**:
- `docs/backend-business-logic-en.md` (primary — current v2.0, Container-flow pivot)
- `docs/backend-business-logic-vi.md` (Vietnamese terms reference)

Required output from this audit:
- List every touched `BR-*` rule
- Note which UI states, transitions, validations, and Vietnamese terms are affected
- Explicitly flag any ambiguity

**Hard rule:** if a relevant business rule is unclear, stop before implementation and surface the ambiguity to the user.

### 4. Start implementation with the senior workflow

Invoke `senior-workflow-frontend` and begin at **Phase 1 — Requirements Clarification**.

Do not jump straight to coding, even if the issue looks small.
Do not skip the workflow phases.
Do not skip self-QA (Phase 5).

At minimum, Phase 1 must produce:
- Who uses the feature
- Exact DoD
- Edge cases
- Risks or unknowns discovered from the issue and business audit

### 5. Run integration architecture checks when contracts move

Invoke `integration-architect` if the task does any of the following:
- Introduces a new endpoint
- Modifies an existing endpoint contract
- Changes a DTO mirrored from backend `iface.go`
- Adds or changes a backend-facing interface referenced from `deps.go`
- Touches `src/types/api.ts` or `src/lib/api/*.ts`

Confirm:
- DTO field names and optionality still match backend JSON
- `npm run gen:api:check` passes (swagger digest is current)
- Query hooks and invalidation still align with the contract
- Any frontend type updates remain synchronized with backend expectations before merge

### 6. Update PROJECT-STATUS.md after issue is closed

After the PR is merged and the issue is closed, update `docs/PROJECT-STATUS.md`:

```markdown
<!-- Pattern to prepend in section 7. Changelog -->
### YYYY-MM-DD
- ✅ PR #N merged · `[scope] description`
- ✅ Issue #N closed · brief summary of what shipped
```

Also update sections 2 (sprint status) and 6 (next plan) when the sprint or backlog state has changed.

**This step is mandatory — do not skip it after completing an issue.**

## Execution notes

- Prefer `glab` for all GitLab interactions (issues, MRs, pipelines).
- Prefer the issue number from the board or issue list as the single source of truth.
- Treat issue title alone as insufficient; always read the full issue body.
- If `glab` access is unavailable, fall back to the GitLab web UI URL pattern:
  `https://gitlab.com/giangdq202/Vmarble-Warehouse-Management-Client/-/issues/<number>`
- When this workflow finishes analysis, continue naturally into implementation using the triggered skills instead of restating the whole process again.

## App domain context (post-Demo-1 pivot)

The core business axis shifted from `Order → Plan → WO → Cut` to **Container-flow**:
`SO → FG Pool → Container → Packing List`

Active modules as of Sprint 7:
- `catalog`, `order`, `planning`, `inventory`, `production`, `costing`, `barcode` — Stable
- `sales` — SalesOrder, SOLineItem, Customer (Sprint 6)
- `delivery` — Container, ContainerLine, LoadingPlan, LoadingException (Sprint 6-7)
- `packing` — FGPool, FGDefect (Sprint 6-7)
- `scrap` — ScrapSale (Sprint 7)
- `loading_exception` — LoadingException queue (Sprint 7)

RBAC personas: `WORKER` (cnc, kiosk-only) < `PLANNER` < `ADMIN`. Accountant, warehouse, foreman, cnc_manager also exist.
