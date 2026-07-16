---
name: senior-workflow-frontend
description: >
  Use when starting ANY non-trivial issue or feature on the Next.js frontend —
  covers the full Senior Engineer workflow: requirements clarification →
  technical design → task breakdown → implement → self-QA → PR.
  ALWAYS trigger this skill when the user says "implement", "add feature",
  "build page", "add component", "create hook", "fix", "fix bug", "find root cause",
  "plan and implement", or pastes a GitHub issue/ticket number.
  Do NOT skip phases — Phase 5 (Self-QA) is the gate before PR and the phase
  most commonly skipped; skipping it is the #1 source of rework.
---

# Senior Engineer Workflow — Next.js Frontend

Run these 6 phases **in order**. Mark each one done before moving to the next.
Phase 5 is mandatory — do not open a PR without completing it.

---

## Phase 1 — Requirements Clarification

Before writing a single line of code, understand the *why*.

**Questions to answer (ask the user if unclear):**
- Who uses this screen?
  - Worker on phone → `(kiosk)` route group, Vietnamese labels, touch targets ≥ 48px
  - Manager on desktop → `(dashboard)` route group, responsive grid
- What is the exact Definition of Done?
  - Screen renders? Or also: loading state, error state, empty state, responsive at 375/768/1280px?
- Adversarial edge cases to surface:
  - "What if the API returns an empty array?"
  - "What if the user taps the button twice before the mutation resolves?"
  - "What if `data` is `undefined` on first render?" (TanStack Query always starts undefined)
  - "Is the response a `PagedResult<T>` (`{ items, total_items }`) or a plain `T[]`?"
  - "Are any date/optional fields missing in some API responses?"
- Is there a Sprint issue number? (for commit/PR tagging)

**Output of this phase:** a short bullet list — *Who / DoD / Edge cases identified*

---

## Phase 2 — Technical Design (Next.js Frontend)

Design before coding. Answer these questions before opening any file.

### Route & component tree
```
Worker on phone?     → (kiosk)/page-name/page.tsx
Manager on desktop?  → (dashboard)/page-name/page.tsx
```
Component tree sketch:
```
page.tsx  (can be server component — exports metadata)
  └── PageContent  ('use client' — owns state + data fetching)
        ├── loading.tsx   (Skeleton that mirrors real layout)
        ├── error.tsx     ('use client' — required directive)
        └── domain components (pure, props only, no fetching)
```

### API alignment check — do this before writing any TypeScript
Read the backend `iface.go` for the relevant module. Confirm:
- Does the endpoint return `PagedResult<T>` or `T[]`?
  - `PagedResult<T>` → `{ items: T[], total_items: number, ... }` — always unwrap `.items`
  - Skipping this causes `TypeError: cannot read property 'filter' of undefined`
- What are the exact JSON field names? Go uses `snake_case` — must match exactly in `src/types/api.ts`
- Which fields are pointers in Go (`*string`, `*time.Time`)? These can be `null` — type them as `field?: string` or `field: string | null`
- Are date fields always present or sometimes omitted? → type as `created_at?: string` and guard before formatting

### State & data flow
- Server state → TanStack Query `useQuery` / `useMutation`
- Local UI state → `useState` in the component
- Cross-component shared state (rare) → Zustand in `src/lib/hooks/`
- Query key strategy: `[domain]` → `[domain, filter]` → `[domain, id]`
- Which queries need `invalidateQueries` after a mutation? List them now.

### Impact analysis
- Does this touch existing cache keys? A mutation may need to invalidate more than one key.
- New route? → needs `loading.tsx` + `error.tsx` siblings
- New navigation entry? → update `side-nav.tsx` or `bottom-nav.tsx` AND `authorization.ts`
- New API domain file? → follow 4-file pattern

**Output of this phase:** component tree sketch, confirmed API shape + optional fields, query keys, list of mutations that invalidate

---

## Phase 3 — Task Breakdown

Split into discrete tasks. Use TaskCreate to track them.

Typical order for a new feature:
1. Add/update types in `src/types/api.ts` (match backend iface.go exactly)
2. Create `src/lib/api/<domain>.ts` (thin wrappers over `apiClient`)
3. Create `src/lib/hooks/use-<domain>.ts` (TanStack Query hooks)
4. Create `page.tsx` + `loading.tsx` + `error.tsx`
5. Build presentational components (no fetch logic inside them)
6. Wire data into page via hooks
7. Handle all three states: loading / error / empty
8. TypeScript check → ESLint → build

**Rule:** Types must be correct before writing hooks. Hooks must be correct before writing UI. Never combine steps that should be sequential.

---

## Phase 4 — Implement

### 4-file pattern for every new API domain
```
src/types/api.ts                      ← Step 1: DTOs (never declare types locally in a page)
src/lib/api/<domain>.ts               ← Step 2: thin API wrappers over apiClient
src/lib/hooks/use-<domain>.ts         ← Step 3: TanStack Query hooks
src/app/(group)/page-name/page.tsx    ← Step 4: page + inline components
```

### Type safety rules
```typescript
// ✅ PagedResult: always unwrap .items
const items = data?.items ?? []

// ✅ Optional/nullable Go fields — guard before use
plan.deadline ? formatDate(plan.deadline) : '—'

// ✅ Dates are strings from Go — parse client-side, never trust format
const d = new Date(entity.created_at)  // could be null if field is optional in Go

// ✅ Nullable Go pointer fields (*string in Go → string | null in TS)
supplier_code: string | null
```

### Hook patterns
```typescript
// Read hook — guard undefined at consumption site, not inside hook
const { data, isLoading, error } = useMyEntities(filter)
const items = data?.items ?? []   // never: data.items.filter(...)

// Mutation — always invalidate on success, toast on error
useMutation({
  mutationFn: myApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [MY_KEY] })
    toast.success('Đã lưu')
  },
  onError: (err: ApiClientError) => toast.error(err.message),
})
```

### Side effect rules — the #1 source of infinite loops
**Never call `setState` or `setX` directly in the render body.**
Any logic of the form "when X changes, update Y state" belongs in `useEffect`:
```typescript
// ❌ Causes infinite loop — new object created every render, condition always true
const prevRef = { current: '' }
if (someValue && prevRef.current !== someValue) {
  prevRef.current = someValue
  setOtherState(...)   // setState in render body → re-render → repeat forever
}

// ✅ Correct — runs after render, only when dependency changes
useEffect(() => {
  if (!someValue) return
  setOtherState(derivedFrom(someValue))
}, [someValue])
```

Use `useRef` for values that must persist across renders **without triggering a re-render** (e.g., scanner ref, previous value tracker). Declare refs with `useRef(initialValue)` — never as a plain object `{ current: '' }`.

### Required states — every data-driven page must have all three
```tsx
if (isLoading) return <Skeleton ... />       // mirrors real layout structure
if (error)     return <ErrorMessage ... />   // error.tsx must have 'use client'
if (!items.length) return <EmptyState />     // specific empty message, not generic
```

### Kiosk-specific rules (if in `(kiosk)` route group)
- All interactive elements: `min-h-[48px]` — no exceptions
- Primary actions: `BigButton` from `@/components/kiosk/big-button`
- All user-visible labels: Vietnamese
- Font size: ≥ 16px for anything the user reads or taps
- Action feedback: `toast.success()` / `toast.error()` within 300ms of mutation settling

### Installing new npm packages
When a task requires a new package:
1. Run `npm install <pkg>` as normal.
2. **Immediately stage `package.json` and `package-lock.json`** in the same commit that first uses the package.
   ```bash
   git add package.json package-lock.json
   ```
   Forgetting this causes CI to fail with "Module not found: Can't resolve '...'" because the lockfile records the resolved version and the package directory, and without it the package is effectively absent in CI.

---

## Phase 5 — Self-QA ⛔ DO NOT SKIP

This is the gate before PR. Work through every section below in order — not just the ones that seem relevant. Most rework in this project comes from skipping this phase.

### Step 5.1 — Run automated checks first
These must all pass before anything else. Fix every error; do not move to 5.2 with failures.

```bash
npx tsc --noEmit        # 0 TypeScript errors — fix all, no exceptions
npm run build           # Next.js production build must succeed
```

`npm run build` is the true gate. Turbopack and the production compiler catch different errors — a passing `tsc --noEmit` does not mean the build will pass.

If lint reports `suggestCanonicalClasses` warnings (Tailwind v4), replace arbitrary values with canonical equivalents:
```
max-w-[375px]  →  max-w-93.75
h-[48px]       →  h-12
```

### Step 5.2 — Read every changed file top to bottom

Do not skim. For each changed file, ask yourself the questions below.

#### Render body side effects
- [ ] Does any code inside the component function (outside `useEffect`) call `setState`, `setX`, or any other state setter **conditionally or based on another state value**?
  - If yes → it causes an infinite re-render loop. Move it to `useEffect`.
- [ ] Is there a `useRef` declared as a plain object literal `{ current: ... }` instead of `useRef(...)`?
  - Plain objects are re-created every render — they cannot track previous values.

#### Import hygiene
- [ ] Are all `import` statements at the **top of the file**, before any other code?
  - ESLint `import/first` will fail if imports appear after variable declarations or JSX.
- [ ] Any unused imports? → remove them.
- [ ] Are imports grouped correctly: React/Next → third-party → `@/` aliases?

#### TypeScript strictness
- [ ] Any `any` type? → replace with `unknown` + type narrowing or the correct type.
- [ ] `data!.field` (non-null assertion)? → replace with `data?.field ?? fallback`.
- [ ] Optional Go field rendered directly without guard?
  - `formatDate(plan.deadline)` where `deadline?: string` → `plan.deadline ? formatDate(plan.deadline) : '—'`
- [ ] `useRef<HTMLElement>(null)` → must be `useRef<HTMLElement | null>(null)` in React 19.
- [ ] Type declared locally inside a component or page file? → move to `src/types/api.ts`.

#### Date handling
- [ ] Every date field from the API — is it typed as optional (`string?`) if the backend Go field is a pointer or omitempty?
- [ ] Is `formatDate` / `new Date()` called without a null/undefined guard?
  - `new Date(undefined)` → `Invalid Date` — always guard first.
- [ ] Is the date string from Go in the expected ISO 8601 format? Check with `console.log` if unsure.

#### TanStack Query correctness
- [ ] Every `useQuery` result used as an array — is it guarded with `?? []`?
- [ ] Mutation `onSuccess` — does it invalidate **all** cache keys that depend on the mutated entity?
  - E.g., creating a plan should invalidate both `['plans']` and potentially `['plan', id]`.
- [ ] Query with a dependency param — does it have `enabled: !!param`?
- [ ] Any query key that is a bare string literal (`'plans'`) instead of an exported constant?

#### Component structure
- [ ] Component longer than ~120 lines? → extract a named sub-component (not an inline arrow function).
- [ ] Inline `style={}` for something Tailwind can express? → replace with `className`.
- [ ] `fetch()` called directly instead of `apiClient`? → replace.
- [ ] `'use client'` missing from a component that uses `useState`, `useEffect`, or browser APIs?
- [ ] `error.tsx` missing `'use client'`? (Next.js requires it — the build will fail without it.)
- [ ] `loading.tsx` skeleton — does it structurally match the real page? (same number of cards/rows)

#### Storybook (if stories were added or modified)
- [ ] All `import` statements at the top of the stories file?
- [ ] Helper components used only in stories — are they named without a leading underscore (since they are used)?
- [ ] Story covers the happy path AND the meaningful error/empty states?

> **Storybook errors are non-blocking.** Lint/build errors in `*.stories.tsx` files do not affect production. If a storybook file has errors, skip fixing it — do not let storybook issues delay a PR. The only exception is if the error is in a shared component that both a story and production code import.

#### Navigation & routing
- [ ] New route added → is it listed in `authorization.ts` so the middleware allows it?
- [ ] New nav item added → does it appear in both `side-nav.tsx` (dashboard) or `bottom-nav.tsx` (kiosk) as appropriate?
- [ ] Nav item points to the correct `href`?

### Step 5.3 — Spot-check in the browser

The `npm run dev` command is blocked in the Claude shell (hook `pre-bash-dev-server-block.js` prevents running it outside tmux). Browser verification must be done manually by the user or in a separate tmux session.

**What to tell the user instead of silently skipping:**
> "Phase 5.3 requires a running dev server — `npm run dev` is blocked in this shell. Please start the server in tmux (`tmux new-session -s dev 'npm run dev'`) and verify these specific scenarios before merging:"

Then list the exact scenarios to check:
- [ ] Page renders at 375px — no horizontal scroll, no clipped text
- [ ] Loading skeleton shows before data arrives
- [ ] Empty state message shows when filters return no results
- [ ] Error toast fires if the API returns a non-2xx response
- [ ] All mutation buttons show success/error toast — no silent failures
- [ ] Console has 0 errors and 0 warnings

---

## Phase 6 — PR

### Commit message format

**Subject line must be ≤ 72 characters.** The `check-commit-message.sh` hook enforces this and will block the commit if exceeded. Count characters before committing — long subject lines are the most common hook failure in this project.

```
[area] verb: brief description          ← max 72 chars total including "[area] "
                                        ← blank line (required for multi-line)
- bullet detail 1
- bullet detail 2
```

`area` is one of: `kiosk`, `dashboard`, `api`, `hooks`, `types`, or the feature name.

**Do NOT add `Co-Authored-By: Claude …` or `🤖 Generated with Claude Code` lines** to commit messages or PR descriptions. The user does not want them.

Example:
```
[kiosk] fix: classify camera errors with user-facing guidance

- Detect NotAllowedError, NotFoundError, insecure context separately
- Show Vietnamese error banner with actionable instructions per error type
- Move lineItems → rows sync into useEffect to prevent infinite re-render
```

### Branch rules
- **Sync with origin/dev FIRST** before creating any branch:
  ```bash
  git fetch origin dev
  git log --oneline origin/dev -5
  ```
  If local `dev` is behind: `git pull --ff-only origin dev` before branching.
- Feature branch from `dev`: `git checkout -b feat/area-brief-description dev`
- Never push directly to `main` or `dev`
- MR: feature → `dev` (approval optional)
- `dev` → `main` requires 1 approval

**GitLab MR (replaces GitHub PR):**
```bash
# Create MR targeting dev
glab mr create --target-branch dev \
  --title "[scope] brief description" \
  --description "$(cat <<'EOF'
## Summary
- What was changed and why
- Route group affected: (kiosk) / (dashboard) / shared

## Technical notes
- New API types added: yes/no — list them
- New query keys: list them
- Breaking changes: yes/no

## Test plan
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] Renders at 375px / 768px / 1280px without layout issues
- [ ] Loading / error / empty states all render correctly
- [ ] All mutations show success/error toast
- [ ] Tested manually: describe scenario

Closes #<issue-number>
EOF
)"
```

If `glab` is unavailable, push the branch and open the MR from the GitLab web UI.

### After the MR is merged — update PROJECT-STATUS.md

**This step is mandatory.** After the MR merges and the issue closes:

1. Open `docs/PROJECT-STATUS.md`
2. Prepend a new entry in section **7. Changelog**:
   ```markdown
   ### YYYY-MM-DD
   - ✅ MR #N merged · `[scope] description`
   - ✅ Issue #N closed · brief summary of what shipped
   ```
3. Update section **2** (sprint status) — move the issue from 🟡 pending to ✅ done.
4. Update section **6** (next plan) — remove the done item, add any newly discovered follow-ups.

Do not skip this. The PROJECT-STATUS.md is the cross-session memory for future Claude sessions.
