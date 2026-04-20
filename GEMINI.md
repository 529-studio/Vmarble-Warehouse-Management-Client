# Gemini CLI Guidance - VMARBLE Frontend

This file mandates the behavior of Gemini CLI to ensure high-quality, responsive, and business-accurate Frontend development for the VMARBLE WMS.

## Skill Discovery

Gemini does not trigger skills automatically. You must manually load the expert guidance for the current task:
1. Identify: Check .claude/skills/ for a relevant subfolder.
2. Read: Use read_file on the SKILL.md inside that folder.
3. Adopt: Treat the instructions in that file as Foundation Mandates for the rest of the session.

## Context and Research Strategy

- Strategic Searching: Use grep_search to locate relevant code points before reading files. Avoid reading large directories unless absolutely necessary.
- Token Conservation: If the session context grows too large, proactively suggest a summary and session reset to maintain speed and accuracy.
- Continuous Verification: Before every implementation or commit, perform a final re-scan of related files to ensure no side effects or regressions were introduced.

## Adversarial Mandate and Refusal

- Architectural Integrity: You are required to critique and challenge any request that violates the Modular Monolith principles or established Frontend patterns.
- Business Logic Validation: If a requested change contradicts the documented Vietnamese business rules (e.g., BR-K03, BR-K04), you must alert the user and request clarification before proceeding.
- Quality Gate: Refuse to implement any feature that lacks clear requirements, types, or a validation plan.

## Active Skills

| Skill | Activation Trigger |
|-------|--------------------|
| senior-workflow-frontend | Mandatory for any new page, component, or logic. Follow Phases 1-6. |
| business-auditor | Validation of UI terminology or logic against docs/ (e.g., remnant flow). |
| product-manager | Frontend backlog management, responsive design task breakdown. |
| integration-architect | Syncing types/api.ts with Backend or updating API hooks. |
| kiosk-component / add-page | Building mobile-first factory UI or new routes. |

## Automation Workflow (Trigger: "Lam task tiep theo")

When triggered, follow this sequence without further instruction:

1. Fetch: Run gh issue list --limit 1 to find the latest frontend task.
2. Analyze: Run gh issue view <id> to understand UI requirements and responsive targets.
3. Audit: Invoke business-auditor. Ensure Vietnamese terminology matches the workshop spec.
4. Implement: Activate senior-workflow-frontend.
5. Architect: Use integration-architect to verify snake_case alignment with Backend iface.go.

## UX and Architecture Rules

- Kiosk Mode: Mobile-first (375px baseline), min touch target 48px, Vietnamese labels only.
- 4-File Pattern: New domains must follow: types/api.ts -> lib/api/ -> lib/hooks/ -> app/.
- States: Every page must handle Loading (Skeleton), Error, and Empty states.
- Snake Case: Always match Go JSON tags. Use PagedResult<T> for lists.

## Commands

- npm run dev: Start Turbopack dev server.
- npx tsc --noEmit: Required before any PR to check types.
- npm run build: The ultimate gatekeeper - always run last.
