# Codex Agent Guide for Vmarble Warehouse Management Client

This file is the Codex-side operating guide, aligned with `CLAUDE.md`.

## Project scope
- Frontend-only repository (Next.js + TypeScript).
- Backend (Go) is in a separate repository; FE contracts must mirror backend `iface.go`.

## Skill locations
- Primary skills copied from project: `.codex/skills/`
- Additional mirrored set: `.codex/agents/*/SKILL.md`

## Mandatory trigger phrases
Treat these as workflow triggers, not casual text:
- "làm task tiếp theo"
- "task tiếp theo"
- "start next task"

When one of these appears, execute the automation workflow below.

## Automation workflow (for "làm task tiếp theo")
1) **Fetch highest-priority open issue** (assigned to me):
```bash
gh issue list --repo giangdq202/Vmarble-Warehouse-Management-Client \
  --assignee @me --state open --json number,title,labels \
  | jq 'sort_by(.labels[].name) | .[0]'
```

2) **Read issue requirements + DoD**:
```bash
gh issue view <number> --repo giangdq202/Vmarble-Warehouse-Management-Client
```

3) **Business audit gate**:
- If task touches business/domain rules (BR-*, remnant lifecycle, costing, allocation), apply `business-auditor` guidance before coding.

4) **Implementation workflow gate**:
- Apply `senior-workflow-frontend` workflow (requirements → design → breakdown → implement → self-QA → PR).
- Do not skip self-QA.

5) **Integration gate (hard rule)**:
- If any change touches:
  - `src/types/api.ts`
  - `src/lib/api/*.ts`
  - TanStack Query hooks calling backend
- Then enforce `integration-architect` checks before finalizing PR.

## Frontend implementation constraints
- Correct route group:
  - Worker mobile UI → `(kiosk)`
  - Manager desktop UI → `(dashboard)`
- Kiosk UX:
  - touch target >= 48px, readable text >= 16px
  - use `BigButton` for primary actions
  - Vietnamese user-facing labels
- Data pages must handle loading/error/empty states.

## API and typing constraints
- API DTOs in `src/types/api.ts` must match backend JSON shape (`snake_case`).
- For paged endpoints, always consume `data?.items ?? []`.
- Guard optional/pointer fields from backend before rendering/formatting.

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
- "implement issue #67"
- "fix bug ở kiosk report-cut"

These should route into the same disciplined workflow above.