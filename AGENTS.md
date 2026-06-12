# AGENTS.md — VMARBLE Warehouse Management Client

Cross-tool coding standards shared across Antigravity CLI, Claude Code, and Cursor.
Stack-specific guidance lives in `CLAUDE.md` / `GEMINI.md`; this file covers portable conventions.

## Stack

Next.js 16.2.1 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · TanStack Query · Zustand

Backend: Go 1.24 + PostgreSQL 17 (separate repo `529-stu/Vmarble-Warehouse-Management-Service`).

## 4-file pattern (new API domains)

```
src/types/api.ts              ← DTO types (mirrors Go iface.go)
src/lib/api/<domain>.ts       ← fetch functions
src/lib/hooks/use-<domain>.ts ← TanStack Query hooks
src/app/<route>/page.tsx      ← page component
```

## DTO alignment

- All API types live in `src/types/api.ts` — mirrors Go backend `iface.go`. This is a copy, not the source.
- JSON keys use `snake_case` (matches Go struct tags).
- List responses use `PagedResult<T>`.
- Never hand-roll fetch calls in components — always use hooks from `src/lib/hooks/`.
- When a BE `iface.go` DTO changes → update `src/types/api.ts` first, then the hook, then the component.

## UX conventions

- Kiosk (shop floor): mobile-first 375 px baseline, min touch target 48 px, Vietnamese labels only.
- Dashboard: desktop/tablet 1280 px baseline.
- Every page handles three states: Loading (Skeleton), Error, and Empty.
- shadcn/ui components live in `src/components/ui/`. Extend via wrapper, never edit generated files.

## State management

- TanStack Query for all server state. Query keys: `[domain, id?, subkey?]`.
- Zustand for lightweight client/UI state only.
- No business logic in components — keep it in hooks or `src/lib/`.

## Error handling

- BE `BizError` maps to HTTP 422/409/412 — always handle these in mutations.
- Display user-facing Vietnamese messages from `error.message` (already human-readable from BE).
- Show toast notifications on mutation errors; use Skeleton on loading state.

## TypeScript conventions

- Strict null checks always on.
- Use `cn()` from `src/lib/utils.ts` for conditional Tailwind classes.
- Prefer explicit generics on hooks over `any`.
- No `console.log` in committed code (pre-commit hook enforces this).

## Branch rules

- Never push directly to `main` or `dev`.
- Feature branches from `dev`. PR: feature → `dev`, `dev` → `main` (1 approval required).
- Commit subject: ≤ 72 chars, English ASCII, Conventional Commit format (`type(scope): description`).

## Skills

Project skills live in `.agents/skills/` (Antigravity) and `.claude/skills/` (Claude Code).
Load the relevant skill before implementing any non-trivial task:

| Skill | When to use |
|---|---|
| `senior-workflow-frontend` | Any new page, component, or business logic — always the outer shell |
| `business-auditor` | Touches BR-* rules or domain terminology |
| `integration-architect` | New API call, `types/api.ts` change, or hook modification |
| `product-manager` | Backlog triage, sprint planning, issue management |
| `add-api-route` | New API domain or TanStack Query hook |
| `add-page` | New page/route — App Router, loading/error siblings |
| `kiosk-component` | Mobile kiosk components — BigButton, ScannerView, touch rules |
| `typescript-patterns` | DTO imports, hook generics, strict null, error handling |
| `frontend-patterns` | React/Next.js composition, hooks, performance |
| `e2e-testing` | Playwright spec design, persona coverage |
| `security-review` | Authz/authn checks, OWASP sweep |
