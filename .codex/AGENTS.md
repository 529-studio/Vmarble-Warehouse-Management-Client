# Codex Agent Guide for Vmarble Warehouse Management Client

This file is the Codex-side operating guide, aligned with the mirrored `.claude/skills` setup.

## Project scope
- Frontend-only repository (Next.js + TypeScript).
- Backend (Go) is in a separate repository; FE contracts must mirror backend `iface.go`.

## Skill locations
- Primary skills: `.codex/skills/`
- Mirrored Codex-agent skills: `.codex/agents/*/SKILL.md`
- Mirrored Claude skills: `.claude/skills/*/SKILL.md`

## Mandatory trigger phrases
Treat these as workflow triggers, not casual text:
- "làm task tiếp theo"
- "task tiếp theo"
- "start next task"
- requests to pick an issue from the GitHub Projects Kanban board

When one of these appears, invoke the `start-next-task` skill and execute the workflow below.

## Automation workflow (for "làm task tiếp theo")
1) **Fetch highest-priority open frontend issue** unless the user already supplied an issue or board item:
```bash
gh issue list --repo giangdq202/Vmarble-Warehouse-Management-Client   --assignee @me --state open --json number,title,labels   | jq 'sort_by(.labels[].name) | .[0]'
```

2) **Read issue requirements + DoD**:
```bash
gh issue view <number> --repo giangdq202/Vmarble-Warehouse-Management-Client
```

3) **Business audit gate**:
- Always apply `business-auditor` against `docs/backend-business-logic-vi.md`.
- Enumerate every touched `BR-*` rule.
- If a relevant business rule is unclear, stop before implementation and surface the blocker.

4) **Implementation workflow gate**:
- Apply `senior-workflow` and start at Phase 1 (Requirements Clarification).
- Do not jump directly into code.
- Do not skip self-QA.

5) **Integration gate (hard rule)**:
- Apply `integration-architect` if the task introduces or changes:
  - an endpoint
  - a DTO mirrored from backend `iface.go`
  - a backend-facing interface such as `deps.go`
  - TanStack Query integrations that depend on the changed contract

## Frontend implementation constraints
- Correct route group:
  - Worker mobile UI → `(kiosk)`
  - Manager desktop UI → `(dashboard)`
- Kiosk UX:
  - touch target >= 48px, readable text >= 16px
  - use `BigButton` for primary actions
  - Vietnamese user-facing labels
- Data pages must handle loading / error / empty states.

## API and typing constraints
- API DTOs in `src/types/api.ts` must match backend JSON shape (`snake_case`).
- For paged endpoints, always consume `data?.items ?? []`.
- Guard optional/pointer fields from backend before rendering or formatting.

## Validation / QA gates
Before PR, run:
```bash
npx tsc --noEmit
npm run lint
npm run build
```
If repository has known pre-existing lint debt, clearly separate:
- errors introduced by this PR
- pre-existing unrelated errors

## Git / PR policy
- Branch from `dev`.
- Never push directly to `dev` or `main`.
- Open PR from feature/chore branch to `dev`.
- Use concise title format: `[area] brief description`.

## Practical trigger examples
- "làm task tiếp theo"
- "task tiếp theo"
- "start next task"
- "pick the next issue from the project board"
- "implement issue #67"
- "fix bug ở kiosk report-cut"

These should route into the same disciplined workflow above.
