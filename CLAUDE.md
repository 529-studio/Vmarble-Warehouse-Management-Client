# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vmarble Warehouse Management System — **Remnant Flow MVP** for a woodworking furniture workshop. The system manages plywood sheet cutting, intelligent remnant (leftover material) tracking and reuse, production planning, QR/barcode labeling, costing, and a warehouse dashboard. The shop-floor interface is a mobile-optimized PWA Kiosk; management uses a desktop Dashboard.

**Stack**: Go 1.24 backend (gin, pgx/v5, PostgreSQL 17) + Next.js 16.2.1 frontend (TypeScript 5, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand).

> This is the **frontend-only** repo. The Go backend lives in a separate repository.

---

## Commands

### Backend (Go)

```bash
# Run all quality checks (fmt → vet → lint → module boundary → tests)
bash tools/scripts/run-quality-checks.sh

# Individual checks
gofmt -w ./internal/ ./cmd/           # Format code
go vet ./...                           # Static analysis
golangci-lint run ./...                # Lint
bash tools/scripts/check-module-boundaries.sh  # Enforce module isolation

# Tests
make test                              # All tests
make test-integration                  # Integration tests (requires Docker Compose DB)
go test -race -count=1 ./internal/module/{name}/...  # Single module
go test -cover ./internal/module/*/service.go        # Coverage check

# Build & run
make build
make dev
```

### Frontend (Next.js — at repo root)

```bash
npm install         # Install dependencies
npm run dev         # Dev server (Turbopack) — http://localhost:3000
npm run build       # Production build
npm run lint        # ESLint check
npm start           # Start production server
```

---

## Backend Architecture

### Module Structure

All business logic lives in `internal/module/`. Every module follows a strict **5-file pattern**:

| File | Purpose |
|------|---------|
| `iface.go` | Exported `Service` interface + all input/output DTOs |
| `store.go` | Unexported `store` interface (repository) |
| `pgstore.go` | PostgreSQL implementation of `store` using `pgx/pgxpool` |
| `service.go` | Business logic implementing `Service`; calls `store` |
| `handler.go` | Gin HTTP handlers; exposes `NewHandler(svc)` and `Register(rg *gin.RouterGroup)` |
| `deps.go` | *(optional)* Exported interfaces for cross-module dependencies |

Wiring in `cmd/server/main.go`: `pgstore → service → handler → register`.

**Modules**: `inventory`, `production`, `costing`, `barcode` (plus `storage-locations` under inventory).

### Module Boundary Rule (hard constraint)

No module may import another module under `internal/module/`. This is enforced by `check-module-boundaries.sh` and will fail CI. Cross-module communication goes through dependency injection via `deps.go` interfaces.

### Data / Error Patterns

- **Parameterized SQL** always; use `RETURNING` for inserts.
- Map `pgx.ErrNoRows` → `domain.ErrNotFound`.
- Sentinel errors live in `domain/errors.go` (e.g., `ErrNotFound`, `ErrInvalidInput`, `ErrInvalidTransition`).
- Use `httpkit` for standardized error responses in handlers.
- Accept `context.Context` for all IO-bound service methods.
- Use `SELECT ... FOR UPDATE` when mutating board sheets or remnants to prevent double-allocation.
- Wrap multi-step DB operations (e.g., `RecordCut`: update sheet + insert cutting record + insert remnant) in a single `pgx.Tx`.

### Database Migrations

Managed with `pressly/goose/v3` in `migrations/`. Use the next sequence number when creating a migration.

### Key Business Concepts

- **Remnant**: Leftover plywood after cutting. Inherits `supplier_code`, `lot_batch`, `grain_pattern`, `quality_grade` from its source (`board_sheet` or `parent_remnant`). Has `bounding_box_length_mm` / `bounding_box_width_mm` for allocation matching.
- **Lineage**: `remnant.parent_remnant_id` chains nested cuts. Area conservation applies at each level.
- **Remnant status lifecycle**: `AVAILABLE → ALLOCATED → USED / DEPLETED`; locked `ALLOCATED` auto-releases after 24 h.
- **Best Fit + FIFO algorithm** (`SuggestRemnants`): `score = w1 * fit_score + w2 * age_score`. Weights are configurable via env vars (defaults: `w1=0.6`, `w2=0.4`).
- **Overflow alert**: `total_remnant_area / total_raw_stock_area > REMNANT_OVERFLOW_THRESHOLD_PCT` (default 15%) → RED status; blocks new sheet issuance.
- **Costing**: Area-based allocation. For nested remnants: `cost = (area / parent_remnant_area) * parent_remnant_value`. Waste is absorbed as overhead (BR-C03).

---

## Testing Conventions

- **Unit tests** (`service_test.go`): table-driven, mock the `store` interface, one file per module.
  - Name pattern: `Test{Method}_{scenario}` (e.g., `TestRecordCut_InsufficientStock`).
  - Cover: happy path, `ErrInvalidInput`, `ErrNotFound`, `ErrInvalidTransition`, business rule violations, edge cases.
- **Integration tests** (`pgstore_test.go`): real PostgreSQL via Docker Compose; each test sets up and tears down its own state.
- No `time.Sleep` or wall-clock dependencies in tests.
- Target: **≥ 80% coverage on `service.go`** per module (checked every PR).
- Run a single module: `go test -race -count=1 ./internal/module/{name}/...`

Use the prompt at `tools/prompts/add-tests.md` when adding tests to an existing module.

---

## Frontend Architecture

The frontend uses Next.js App Router with a `src/` folder and a single root layout that provides providers and PWA meta. Two route groups define completely separate UI experiences:

- **`(kiosk)`** — Mobile-optimized shop-floor interface (375 px baseline). Fixed bottom tab nav, `BigButton` (min 56 px), font ≥ 16 px, touch targets ≥ 48 px.
- **`(dashboard)`** — Desktop/tablet management views (1280 px baseline). Fixed 240 px side nav.
- **`(auth)`** — Login page (no nav chrome).

```
src/
├── app/
│   ├── layout.tsx                  ← Root: html/body, Providers, Toaster, PWA meta
│   ├── not-found.tsx
│   ├── global-error.tsx            ← "use client" global error boundary
│   ├── (auth)/login/page.tsx
│   ├── (kiosk)/
│   │   ├── layout.tsx              ← Header + BottomNav chrome
│   │   ├── cutting-orders/         ← page.tsx + loading.tsx
│   │   ├── report-cut/page.tsx
│   │   ├── remnant-store/page.tsx
│   │   ├── remnant-list/page.tsx
│   │   └── scan/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx              ← SideNav chrome
│       ├── overview/               ← page.tsx + loading.tsx
│       ├── remnants/page.tsx
│       └── costing/page.tsx
├── components/
│   ├── ui/                         ← shadcn/ui components
│   ├── kiosk/                      ← BigButton, ScannerView, LabelPreview, BottomNav
│   └── dashboard/                  ← StatCard, AlertBanner, SideNav
├── lib/
│   ├── api/                        ← client.ts + domain files (remnants, cutting-orders, barcode, dashboard)
│   ├── hooks/                      ← TanStack Query hooks per domain
│   ├── utils.ts                    ← cn() utility
│   └── providers.tsx               ← QueryClientProvider wrapper
├── styles/globals.css              ← Tailwind v4 @import + shadcn CSS variables
└── types/api.ts                    ← Shared API DTOs (mirrors Go backend iface.go types)
```

### shadcn/ui

Components live in `src/components/ui/`. Config is in `components.json` (style: `new-york`, baseColor: `neutral`). To add a new component:

```bash
npx shadcn@latest add <component-name>
```

Do **not** edit generated shadcn files directly if re-running `add` — extend them via wrapper components instead.

### Tailwind CSS v4

- No `tailwind.config.js` — configuration is CSS-first via `src/styles/globals.css`.
- CSS variables for theming use `oklch` color space via `@theme inline`.
- PostCSS plugin: `@tailwindcss/postcss` in `postcss.config.mjs`.

### State management

- **TanStack Query** (`src/lib/hooks/`) — all server state. Query keys follow pattern `[domain, id?, subkey?]`.
- **Zustand** (`src/lib/hooks/use-scan.ts`) — lightweight client state (scan flow, UI state).

### API client

`src/lib/api/client.ts` exports `apiClient` (typed `fetch` wrapper). Domain-specific files (`remnants.ts`, `cutting-orders.ts`, `barcode.ts`, `dashboard.ts`) expose functions consumed by TanStack Query hooks. Base URL reads from `NEXT_PUBLIC_API_URL`.

### QR scanning

`ScannerView` (`src/components/kiosk/scanner-view.tsx`) uses `html5-qrcode` (dynamically imported to avoid SSR). Falls back to manual text input when camera permission is denied.

### Responsive breakpoints

Mobile 375 px → Tablet 768 px → Desktop 1280 px. Every screen must render correctly at all three widths.

---

## API Conventions

All routes are prefixed `/api/v1/`. Keep Swagger/OpenAPI updated with every endpoint change.

Notable endpoints (reference for context):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/remnants` | Filter by `min_length`, `min_width`, `material_type`, `status` |
| GET | `/remnants/:id/lineage` | Full lineage chain |
| POST | `/inventory/suggest-allocation` | Best Fit + FIFO suggestions |
| POST | `/inventory/allocate` | Lock remnant to work order |
| GET | `/barcode/:id/qr` | QR code PNG |
| GET | `/barcode/:id/label` | Printable PDF label |
| POST | `/barcode/scan` | Record checkpoint scan |
| GET | `/inventory/overflow-status` | Overflow alert status |
| GET | `/dashboard/remnant-summary` | Remnant stats |
| GET | `/costing/reports` | Cost breakdown by PO |

---

## Git & PR Workflow

```
main  (production)
  ↑  PR, 1 approval required
dev   (integration)
  ↑  PR from feature branches
feature/s{n}-{description}
```

PR title format: `[module] brief description`
Example: `[inventory] add transaction support for RecordCut`

**Definition of Done** (every task):
- Unit tests pass, service-layer coverage ≥ 80%
- Lint passes (`make lint`)
- Reviewed by ≥ 1 team member
- Swagger/OpenAPI updated (backend) or responsive on 375/768/1280 px (frontend)
- Deployed to staging

---

## Creating a New Module

Use the prompt at `tools/prompts/new-module.md` as a scaffold template when creating a new backend module. Fill in `{MODULE_NAME}`, `{DESCRIBE_RULES}`, and `{DESCRIBE_ENTITIES}`.
