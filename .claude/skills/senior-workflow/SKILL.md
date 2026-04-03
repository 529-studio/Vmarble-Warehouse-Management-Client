---
name: senior-workflow
description: >
  Use when starting ANY non-trivial issue or feature on the Next.js frontend —
  covers the full Senior Engineer workflow: requirements clarification →
  technical design → task breakdown → implement + test → self-QA → PR.
  ALWAYS trigger this skill when the user says "implement", "add feature",
  "build page", "add component", "create hook", or pastes a GitHub issue/ticket.
  Do NOT skip phases — especially Phase 5 (Self-QA) which is the most commonly
  forgotten step before submitting code.
---

# Senior Engineer Workflow — Next.js Frontend

Run these 6 phases **in order**. Mark each one done before moving to the next.
Never skip Phase 5 — it is the gate before PR.

---

## Phase 1 — Requirements Clarification

Before writing a single line of code, understand the *why*.

**Questions to answer (ask the user if unclear):**
- Who uses this screen — worker on mobile kiosk or manager on desktop dashboard?
  - Kiosk → `(kiosk)` route group, Vietnamese labels, touch targets ≥ 48px
  - Dashboard → `(dashboard)` route group, desktop/responsive grid
- What is the exact Definition of Done?
  - Screen renders? Or also: loading state, error state, empty state, edge cases?
- Adversarial edge cases to surface:
  - "What if the API returns an empty array?"
  - "What if the user taps the button twice before the mutation resolves?"
  - "What if `data` is `undefined` on first render?" (TanStack Query)
  - "Is the response a `PagedResult<T>` or a plain `T[]`?" ← common type mismatch bug
- Is there a Sprint issue number? (for commit/PR tagging)

**Output of this phase:** a short bullet list: *Who / DoD / Edge cases identified*

---

## Phase 2 — Technical Design (Next.js Frontend)

Design before coding. Answer these questions before opening any file.

### Route & component tree decision
```
Worker on phone?      → (kiosk)/page-name/page.tsx
Manager on desktop?   → (dashboard)/page-name/page.tsx
```
Component tree sketch:
```
page.tsx (server component — exports metadata)
  └── PageContent.tsx ('use client' — data fetching + state)
        ├── LoadingSkeleton (loading.tsx)
        ├── ErrorBoundary (error.tsx)
        └── DomainCard / DomainTable / etc.
```

### API alignment check
Before writing types, read the backend `iface.go` for the relevant module.
Key questions:
- Does the endpoint return `PagedResult<T>` or `T[]`?
  - `PagedResult<T>` has `{ items: T[], total_items: N, ... }` — must unwrap `.items`
  - Forgetting this causes `TypeError: x.filter is not a function` at runtime
- What are the exact field names? (Go uses `snake_case`, must match exactly in `src/types/api.ts`)
- Are there nullable fields (`*string` in Go → `string | null` or `string | undefined` in TS)?

### State & data flow
- Server state (from API) → TanStack Query `useQuery` / `useMutation`
- UI-only state → `useState` in the component
- Global shared state (rare) → Zustand store in `src/lib/hooks/`
- Query key strategy: `[domain]` → `[domain, filter]` → `[domain, id]`
- Which queries need `invalidateQueries` after a mutation?

### Impact analysis
- Does this touch existing TanStack Query cache keys? (mutation might need to invalidate more)
- Does this add a new route? → needs `loading.tsx` + `error.tsx` siblings
- Does this add a new `src/lib/api/*.ts` file? → follow 4-file pattern
- Is there a real-time need? → `refetchInterval` or `refetchOnWindowFocus`

**Output of this phase:** component tree, confirmed API shape, query keys, state decisions

---

## Phase 3 — Task Breakdown

Split into sub-tasks of 2–4 hours each. Create a TodoList.

Typical order for a new feature:
1. Add/update types in `src/types/api.ts`
2. Create `src/lib/api/<domain>.ts` (API functions)
3. Create `src/lib/hooks/use-<domain>.ts` (TanStack Query hooks)
4. Create page files: `page.tsx` + `loading.tsx` + `error.tsx`
5. Build presentational components (no data fetching logic inside)
6. Wire data into page via hooks
7. Handle empty state, error state, loading state
8. TypeScript check + lint

**Rule:** Types must be correct before writing hooks. Hooks must be correct before writing UI.

---

## Phase 4 — Implement & Test (Next.js Frontend)

### 4-file pattern for every new API domain

```
src/types/api.ts           ← Step 1: add DTOs (never re-declare locally)
src/lib/api/<domain>.ts    ← Step 2: thin API wrappers over apiClient
src/lib/hooks/use-<domain>.ts  ← Step 3: TanStack Query hooks
src/app/(group)/page/page.tsx  ← Step 4: page + components
```

### Type safety rules
```typescript
// ✅ Always use PagedResult generic when endpoint is paginated
apiClient.get<PagedResult<Remnant>>('/inventory/remnants', { params: { limit: 1000 } })
  .then(res => res.items)  // ← always unwrap .items

// ✅ Dates are strings from Go — parse client-side
const date = new Date(remnant.created_at)

// ✅ Nullable Go fields (*string) → string | null in TS
supplier_code: string | null
```

### Hook patterns
```typescript
// Read hook — always guard undefined
const { data, isLoading, error } = useMyEntities(filter)
const items = data ?? []   // never data.filter() without ?? []

// Mutation — always invalidate on success
useMutation({
  mutationFn: myApi.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: [MY_ENTITY_KEY] }),
  onError: (err: ApiClientError) => toast.error(err.message),
})
```

### Required states — all three must exist for every data-driven page
```tsx
if (isLoading) return <Skeleton ... />          // loading state
if (error) return <ErrorMessage ... />          // error state
if (items.length === 0) return <EmptyState />   // empty state
```

### Kiosk-specific rules (if in `(kiosk)` route group)
- All interactive elements: `min-h-[48px]`
- Primary actions: `BigButton` from `@/components/kiosk/big-button` (not `Button`)
- All labels: Vietnamese
- Font size: ≥ 16px for all text the user reads/taps
- Action feedback: `toast.success()` / `toast.error()` within 300ms

---

## Phase 5 — Self-QA & Refactor ⛔ DO NOT SKIP

This phase is the gate before PR. Run through **all** of these.

### Type mismatch checklist (most common bugs)
- [ ] API returns `PagedResult<T>` but code treats it as `T[]`? → add `.then(res => res.items)`
- [ ] Used `data!.items` without null guard? → change to `data?.items ?? []`
- [ ] `useRef<HTMLDivElement>(null)` typed as `RefObject<HTMLDivElement>`? → must be `RefObject<HTMLDivElement | null>` in React 19
- [ ] Hook file has `'use client'` at top unnecessarily? → remove if no browser APIs used

### Code smell checklist
- [ ] Component over 100 lines? → extract sub-component
- [ ] Inline style for something Tailwind can do? → replace with className
- [ ] `any` type anywhere? → replace with `unknown` + narrowing or proper type
- [ ] `fetch()` called directly instead of `apiClient`? → replace
- [ ] Same type declared in two places? → consolidate to `src/types/api.ts`
- [ ] Query key as bare string `"remnants"`? → use exported constant `REMNANT_KEY`
- [ ] Missing `enabled: !!id` on query that depends on a param?

### Silly bug checklist
- [ ] `data?.filter(...)` but `data` could be `undefined` → `(data ?? []).filter(...)`
- [ ] Mutation called without `await` inside async function?
- [ ] `toast.loading()` shown but never dismissed on error path?
- [ ] `loading.tsx` structure doesn't match actual page (different number of cards)?
- [ ] `error.tsx` missing `'use client'` directive?
- [ ] Double padding: layout has `p-4` AND page wrapper has `p-4`?

### Automated checks (must all pass before PR)
```bash
npx tsc --noEmit       # 0 TypeScript errors
npm run lint           # 0 ESLint warnings/errors
npm run build          # next build succeeds
```

If `tsc --noEmit` finds errors → fix all of them, no exceptions.

---

## Phase 6 — PR

### Commit message format
```
[area] verb: brief description

- bullet point detail 1
- bullet point detail 2

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Where `area` is: `kiosk`, `dashboard`, `api`, `hooks`, `types`, or the feature name.

Example:
```
[kiosk] feat: add pull-to-refresh on cutting orders page

- Attach touch listeners at document level (not child div)
- Read window.scrollY for scroll position check
- Default threshold: 72px with rubber-band damping

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### Branch rules
- Feature branch from `dev`: `git checkout -b feat/area-brief-description dev`
- Never push directly to `main` or `dev`
- PR: feature → `dev` (approval optional)
- `dev` → `main` requires 1 approval

### PR body template
```markdown
## Summary
- What was changed and why
- Route group affected: (kiosk) / (dashboard) / shared

## Technical notes
- New API types added: yes/no
- New query keys: list them
- Breaking changes: yes/no

## Test plan
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] Tested at 375px width (mobile kiosk) if applicable
- [ ] Loading / error / empty states all render correctly
- [ ] Tested manually: describe scenario
```
