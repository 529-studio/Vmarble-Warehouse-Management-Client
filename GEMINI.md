# Vmarble Warehouse Client — Agent Guide

Frontend-only repo. Backend lives in `../be-vwms/` (separate Git repo).

**GitHub repo:** `giangdq202/Vmarble-Warehouse-Management-Client`

## Stack

- Next.js 16.2.1 (App Router, Turbopack)
- TypeScript 5, Tailwind CSS v4 (CSS-first config), shadcn/ui (new-york, neutral)
- TanStack Query v5 — server state
- Zustand v5 — client/UI state
- React Hook Form, Recharts, Sonner (toasts), html5-qrcode
- Vitest + Playwright for testing, Storybook for component docs

## Commands

```bash
npm install         # Install dependencies
npm run dev         # Dev server (Turbopack) → http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint
npm start           # Start production server
npm run storybook   # Component docs → http://localhost:6006
```

## gh CLI

```bash
gh pr list
gh pr create --title "[module] description" --body "..."
gh issue list
# No --repo flag needed when inside this folder
```

## File structure

```
src/
├── app/
│   ├── layout.tsx                  ← Root: Providers, Toaster, PWA meta
│   ├── (auth)/login/page.tsx       ← Login page (no nav chrome)
│   ├── (kiosk)/                    ← Mobile shop-floor UI (375px baseline)
│   │   ├── layout.tsx              ← Header + BottomNav
│   │   ├── cutting-orders/
│   │   ├── report-cut/
│   │   ├── remnant-store/
│   │   ├── remnant-list/
│   │   └── scan/
│   └── (dashboard)/                ← Desktop management UI (1280px baseline)
│       ├── layout.tsx              ← SideNav
│       ├── overview/
│       ├── remnants/
│       └── costing/
├── components/
│   ├── ui/                         ← shadcn/ui generated (do not edit directly)
│   ├── kiosk/                      ← BigButton, ScannerView, LabelPreview, BottomNav
│   └── dashboard/                  ← StatCard, AlertBanner, SideNav
├── lib/
│   ├── api/                        ← client.ts + domain files per module
│   ├── hooks/                      ← TanStack Query hooks per domain
│   ├── utils.ts                    ← cn() utility
│   └── providers.tsx               ← QueryClientProvider
├── styles/globals.css              ← Tailwind v4 @import + shadcn CSS vars (oklch)
└── types/api.ts                    ← Shared API DTOs (mirrors backend iface.go)
```

## Architecture rules

### Route groups
- `(kiosk)`: Mobile-optimized, 375px baseline, min touch target 48px, font ≥ 16px
- `(dashboard)`: Desktop/tablet, 1280px baseline, fixed 240px side nav
- All screens must render correctly at 375px, 768px, 1280px

### State management
- **TanStack Query** for all server state — query keys pattern: `[domain, id?, subkey?]`
- **Zustand** for lightweight client/UI state (scan flow, etc.)
- No auth context exists yet — token stored in `localStorage['auth_token']`

### API client
- `src/lib/api/client.ts` exports `apiClient` (typed fetch wrapper)
- Auto-injects `Authorization: Bearer <token>` from localStorage
- Domain files: `remnants.ts`, `cutting-orders.ts`, `barcode.ts`, `dashboard.ts`
- Base URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080/api/v1`)

### Tailwind CSS v4
- No `tailwind.config.js` — config is CSS-first in `src/styles/globals.css`
- PostCSS plugin: `@tailwindcss/postcss` in `postcss.config.mjs`

### shadcn/ui
- Add components: `npx shadcn@latest add <component-name>`
- Never edit generated files in `src/components/ui/` — extend via wrapper components

## Key business concepts

- **Remnant**: Leftover plywood after cutting. Has `bounding_box_length_mm/width_mm` for allocation matching. Lifecycle: `AVAILABLE → ALLOCATED → USED/DEPLETED`
- **Best Fit + FIFO**: `score = 0.6 * fit_score + 0.4 * age_score`. Backend endpoint `POST /inventory/suggest-allocation` is **planned but not yet implemented** — frontend approximates client-side in `useSuggestRemnants`
- **Overflow alert**: `total_remnant_area / total_raw_stock_area > 15%` → RED, blocks new sheet issuance
- **Costing**: Area-based. Waste absorbed as overhead (BR-C03)

## Auth status

| Component         | Status          |
|-------------------|-----------------|
| Token validation  | ✅ Backend done  |
| API token inject  | ✅ client.ts     |
| Login form logic  | ❌ Not implemented |
| Login endpoint    | ❌ Backend missing |
| Protected routes  | ❌ Not implemented |
| Logout            | ❌ Not implemented |

Token format: `base64url(payload).base64url(HMAC-SHA256(payload, secret))`
Payload: `{ user_id, role, exp }` — roles: admin, accountant, planner, warehouse, cnc, foreman

## Branch & PR rules

- Never push directly to `main` or `dev`
- Feature branches from `dev`: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `test/`
- PRs: feature → `dev`, `dev` → `main` (1 approval)
- PR title: `[module] brief description`
- PR body: Summary + business rules + test plan
- Responsive check at 375/768/1280px is required for every PR
