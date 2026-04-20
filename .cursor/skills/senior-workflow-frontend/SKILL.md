---
name: senior-workflow-frontend
description: >
  Use when starting ANY non-trivial issue or feature on the Next.js frontend —
  covers the full Senior Engineer workflow: requirements clarification ->
  technical design -> task breakdown -> implement -> self-QA -> PR.
  ALWAYS trigger this skill when the user says "implement", "add feature",
  "build page", "add component", "create hook", "fix", "fix bug", "find root cause",
  "plan and implement", "sua" or pastes a GitHub issue/ticket number.
  Do NOT skip phases — Phase 5 (Self-QA) is the gate before PR and the phase
  most commonly skipped; skipping it is the #1 source of rework.
---

# Senior Engineer Workflow - Next.js Frontend

Run these 6 phases in order. Mark each one done before moving to the next.
Phase 5 is mandatory — do not open a PR without completing it.

## Phase 1 - Requirements Clarification

Before writing a single line of code, understand the why.

Questions to answer (ask the user if unclear):
- Who uses this screen?
  - Worker on phone -> (kiosk) route group, Vietnamese labels, touch targets >= 48px
  - Manager on desktop -> (dashboard) route group, responsive grid
- What is the exact Definition of Done?
  - Screen renders? Or also: loading state, error state, empty state, responsive at 375/768/1280px?
- Adversarial edge cases to surface:
  - "What if the API returns an empty array?"
  - "What if the user taps the button twice before the mutation resolves?"
  - "What if data is undefined on first render?"
  - "Is the response a PagedResult<T> or a plain T[]?"
- Is there a Sprint issue number? (for commit/PR tagging)

Output of this phase: a short bullet list — Who / DoD / Edge cases identified.

## Phase 2 - Technical Design and Artifact Generation

Design before coding. Every non-trivial task must have a design record.

Task: Generate a Design Artifact
- Create a temporary markdown file in a .cursor/plans/ directory (e.g., .cursor/plans/feat-name.md) detailing the architecture, component tree, and state flow before implementation.

Route and component tree analysis:
- Worker on phone -> (kiosk)/page-name/page.tsx
- Manager on desktop -> (dashboard)/page-name/page.tsx

API alignment check:
- Read backend iface.go and confirm DTO shapes and nullability.
- Map snake_case to TypeScript types in src/types/api.ts.

State and data flow:
- Identify TanStack Query keys and mutation invalidation strategy.

Output of this phase: A path to the created Design Artifact file.

## Phase 3 - Task Breakdown

Split into discrete tasks. Use TaskCreate to track them.

Typical order:
1. Add/update types in src/types/api.ts.
2. Create API wrappers and TanStack Query hooks.
3. Build presentational components and pages.
4. Wire data and handle Loading/Error/Empty states.
5. Run TypeScript and Lint checks.

## Phase 4 - Implement

Follow the 4-file pattern: types -> api -> hooks -> app.

Type safety rules:
- Guard all optional fields.
- Unwrap PagedResult.items.
- Parse Go dates safely.

Side effect rules:
- Never call state setters in the render body.
- Use useEffect for derived side effects.
- Use useRef for persistent values that don't trigger re-renders.

Kiosk-specific rules:
- Min-h-[48px] for all interactive elements.
- Vietnamese labels only.
- Direct and clear action feedback via toasts.

## Phase 5 - Self-QA and Continuous Verification

This is the mandatory gate before PR.

Step 5.1 - Automated Checks:
- npx tsc --noEmit
- npm run lint
- npm run build

Step 5.2 - Static Code Review:
- Verify no infinite loops in useEffect.
- Check import hygiene (Next -> Third party -> @/ aliases).
- Ensure 100% type safety (no 'any').

Step 5.3 - Continuous Research:
- Re-scan all modified and related files to ensure no side effects were introduced by late-stage changes.
- Verify the implementation still aligns with the Design Artifact from Phase 2.

## Phase 6 - PR and Knowledge Extraction

PR body template must be followed.

Final Step: Update Instincts
- Analyze the completed task for any new patterns, bugs, or "senior instincts" discovered.
- Append these lessons to Vmarble-Warehouse-Management-Client/INSTINCTS.md to prevent future mistakes.

Commit message format: [area] verb: brief description.
- area: kiosk, dashboard, api, hooks, types, or feature name.
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
