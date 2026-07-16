---
name: senior-workflow
description: >
  Use when starting any non-trivial issue or feature on the Next.js frontend —
  covers the full Senior Engineer workflow: requirements clarification →
  technical design → task breakdown → implement + test → self-QA → PR.
  Always trigger this skill when the user says "implement", "add feature",
  "build page", "add component", "create hook", "fix", "fix bug",
  "find root cause", pastes a GitHub issue/ticket, or enters the
  "Làm task tiếp theo" / "Start next task" automation flow after issue
  selection. Start at Phase 1 and never jump straight to coding.
---

# Senior Engineer Workflow — Next.js Frontend

Run these 6 phases in order. Mark each one done before moving to the next.
Never skip Phase 1 during the next-task automation flow.
Never skip Phase 5 — it is the gate before PR.

---

## Automation handoff rule

When this skill is invoked from `start-next-task`:
1. Start from the selected issue body and DoD.
2. Incorporate the `business-auditor` findings before design.
3. If contract changes are present, schedule `integration-architect` checks before finalizing implementation.
4. Begin at **Phase 1 — Requirements Clarification**. Do not open files for coding first.

---

## Phase 1 — Requirements Clarification

Before writing a single line of code, understand the *why*.

**Questions to answer (ask the user if still unclear after reading the issue):**
- Who uses this screen — worker on mobile kiosk or manager on desktop dashboard?
  - Kiosk → `(kiosk)` route group, Vietnamese labels, touch targets ≥ 48px
  - Dashboard → `(dashboard)` route group, desktop/responsive grid
- What is the exact Definition of Done?
  - Screen renders? Or also: loading state, error state, empty state, edge cases?
- Which `BR-*` rules from the business audit constrain the behavior?
- Adversarial edge cases to surface:
  - "What if the API returns an empty array?"
  - "What if the user taps the button twice before the mutation resolves?"
  - "What if `data` is `undefined` on first render?" (TanStack Query)
  - "Is the response a `PagedResult<T>` or a plain `T[]`?" ← common type mismatch bug
- Is there a Sprint issue number? (for commit/PR tagging)

**Output of this phase:** a short bullet list: *Who / DoD / BR-* constraints / Edge cases identified*

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
- Did `integration-architect` need to review any contract changes?

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
npm run build          # next build succeeds — ALWAYS run this last
```

**Rule: `npm run build` is mandatory after every implement/fix task.** TypeScript errors caught by `tsc --noEmit` may differ from the build-time checker. Only a passing `npm run build` is the true gate.

If `tsc --noEmit` finds errors, fix all of them.

---

## Phase 6 — PR

### Commit message format
```
[area] verb: brief description

- bullet point detail 1
- bullet point detail 2
```

Where `area` is: `kiosk`, `dashboard`, `api`, `hooks`, `types`, or the feature name.

**Do NOT add `Co-Authored-By: Claude …` or `🤖 Generated with Claude Code` lines** to commit messages or PR descriptions. The user does not want them.
