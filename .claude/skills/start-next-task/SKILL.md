---
name: start-next-task
description: >
  Use when the user says "Làm task tiếp theo", "task tiếp theo", "Start next task", asks Codex to pick the next issue, or wants Codex to continue from a GitHub Projects Kanban item. Orchestrate the automation workflow in order: fetch the highest-priority open issue from giangdq202/Vmarble-Warehouse-Management-Service via the product-manager workflow, read the full issue and Definition of Done, run a business-auditor pass against docs/backend-business-logic-vi.md to identify every touched BR-* rule and block if any rule is unclear, then hand off to senior-workflow starting at Phase 1, and invoke integration-architect whenever the task adds or changes an endpoint, a DTO mirrored from iface.go, or a deps.go interface.
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

## Workflow

### 1. Fetch the highest-priority open issue

Use the `product-manager` skill to identify the next issue to work on.

If the user already picked a GitHub Projects Kanban card or gave an issue number, skip the fetch step and use that issue directly.

Otherwise run:

```bash
gh issue list --repo giangdq202/Vmarble-Warehouse-Management-Service   --assignee @me --state open --json number,title,labels   | jq 'sort_by(.labels[].name) | .[0]'
```

### 2. Analyze the requirement

Read the complete issue body before planning implementation:

```bash
gh issue view <number> --repo giangdq202/Vmarble-Warehouse-Management-Service
```

Extract at least:
- Summary / user problem
- Definition of Done
- Route or module hints
- API or data-contract implications
- Missing details that could block implementation

### 3. Audit business rules before coding

Invoke `business-auditor` and cross-reference the issue against `docs/backend-business-logic-vi.md`.

Required output from this audit:
- List every touched `BR-*` rule
- Note which UI states, transitions, validations, and Vietnamese terms are affected
- Explicitly flag any ambiguity

**Hard rule:** if a relevant business rule is unclear, stop before implementation and surface the ambiguity to the user.

### 4. Start implementation with the senior workflow

Invoke `senior-workflow` and begin at **Phase 1 — Requirements Clarification**.

Do not jump straight to coding, even if the issue looks small.
Do not skip the workflow phases.
Do not skip self-QA.

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

Confirm:
- DTO field names and optionality still match backend JSON
- Query hooks and invalidation still align with the contract
- Any frontend type updates remain synchronized with backend expectations before merge

## Execution notes

- Prefer the issue number from the board or issue list as the single source of truth.
- Treat issue title alone as insufficient; always read the full issue body.
- If `gh` access is unavailable, report the blockage and ask the user for the issue number or issue text.
- When this workflow finishes analysis, continue naturally into implementation using the triggered skills instead of restating the whole process again.
