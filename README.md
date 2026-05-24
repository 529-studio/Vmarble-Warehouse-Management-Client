# Vmarble Warehouse Management — Frontend

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=react-query)](https://tanstack.com/query)
[![Playwright](https://img.shields.io/badge/Playwright-green?logo=playwright)](https://playwright.dev/)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0/)

> **Production manufacturing execution system (MES) running live at a Vietnam-based stone & wood export factory.**
> Built end-to-end as the contracted engineer for a real, paying client. Self-funded hosting, real factory staff using it daily, real customer money on the line — not a school project.

This repo is the frontend. The accompanying [backend](https://github.com/giangdq202/Vmarble-Warehouse-Management-Service) is a Go modular monolith (Gin + pgx/v5 + PostgreSQL 17).

> **Note on what's open vs. closed**
> The code is open for technical reference (architecture, patterns, testing, CI/CD). Customer-specific business rules, sales scripts, and operational runbooks live outside this repo by contractual courtesy — code stays public, business stays private.

---

## Production Snapshot

| | |
|---|---|
| **Stage** | Live in production with a paying client |
| **Engagement** | Solo contractor build; full-stack ownership (BE + FE + DB + deploy + on-call) |
| **Surfaces** | Desktop dashboard (planners, accountants, owner) + mobile kiosk PWA (shop-floor workers) |
| **Hosting** | Self-funded VPS; Docker compose; HTTPS via reverse proxy |
| **Operations** | GitHub Actions CD on push to `dev`; rolling restarts; type-checked builds gating merge |
| **Reliability** | Strict TS, ESLint zero-warning gate, Vitest component tests, Playwright E2E smoke |

Demo / staging URL is shared on request — production URL is held private at the customer's request.

---

## What this app does (high level)

A single Next.js app serving two distinct audiences off the same API contract:

```
┌─ Desktop dashboard ────────────────────────────────────────────────┐
│ Planners / accountants / owner                                     │
│ Catalog · Orders · Plans · Work orders · Costing · Reports · Users │
└────────────────────────────────────────────────────────────────────┘
                                 ↓ shared typed API client
┌─ Mobile kiosk PWA ─────────────────────────────────────────────────┐
│ Shop-floor workers on tablets at cutting / processing stations     │
│ Cutting orders · Report cut · Remnant intake · Scan checkpoints    │
└────────────────────────────────────────────────────────────────────┘
```

Two route groups, one design system, one auth session, one TanStack Query cache. The kiosk is touch-first (≥48 px tap targets, 375 px baseline, wake-lock during scans); the dashboard is information-dense (1280 px baseline, side nav, KPI cards, charts).

> Specific business rules (validation thresholds, allocation strategies, costing formulas) live in private specs by client agreement. The implementation patterns — how those rules are surfaced in the UI — are visible throughout `src/app/(dashboard)` and `src/app/(kiosk)`.

---

## Why this codebase is interesting (engineer-eye view)

| Concern | Choice | Why it matters |
|---|---|---|
| **App shell** | Next.js 15 App Router with two route groups (`(dashboard)`, `(kiosk)`) on a single deployment | One auth session, one query cache, one design system across desktop and mobile-PWA personas |
| **API contract** | DTOs in `src/types/api.ts` are hand-aligned to the Go backend's `iface.go` (snake_case preserved) | No codegen drift; types are the single source of truth between BE and FE |
| **Data layer** | TanStack Query v5 hooks per domain in `src/lib/hooks/`; thin typed `fetch` wrappers in `src/lib/api/` | Cache invalidation is explicit and colocated with mutations; no global store soup |
| **State** | Zustand for ephemeral UI state only; server state lives in Query | Rules out the usual Redux-everywhere antipattern; render-correctness comes from invalidation, not selectors |
| **RBAC** | Central `can(role, action, resource)` policy in `src/lib/auth/`; every gated UI consults it | New screens can't accidentally leak across personas; one place to audit |
| **Forms & validation** | shadcn/ui + react-hook-form + zod schemas mirroring the backend's domain rules | Inline validation matches what the API would reject anyway — no double-source of truth surprises |
| **Kiosk UX** | PWA install, wake-lock during scans, tactile vibration on success, BigButton primitives, 48 px touch minimum | Built around real-world tablet use on a factory floor — gloves, glare, dust |
| **Testing** | Vitest + Testing Library for components; Playwright for end-to-end smoke; Storybook play() interactions | Three layers, none redundant — units catch logic, E2E catches wiring, Storybook catches states |
| **CI** | `tsc --noEmit` + `next build` + ESLint zero-warning gate on every PR | A failing PR cannot merge; type errors are caught before review |

---

## Quick Start

```bash
npm install
npm run dev          # Turbopack dev server — http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint (0 warnings enforced)
```

### Environment

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_API_URL=/api/proxy    # Next.js rewrite → Go backend
BACKEND_URL=http://localhost:8080 # Go backend (server-side only)
```

Pair with the [backend](https://github.com/giangdq202/Vmarble-Warehouse-Management-Service) running locally (`docker compose up --build` in that repo) and you have the full stack on one machine.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| Server state | TanStack Query v5 |
| Client state | Zustand (ephemeral UI only) |
| Forms | react-hook-form + zod |
| Tests | Vitest + Testing Library; Playwright; Storybook play() |
| CI | GitHub Actions — tsc + ESLint + build |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (kiosk)/           cutting-orders · report-cut · remnant-store
│   │                      remnant-list · scan · account
│   └── (dashboard)/       overview · materials · skus · pos · plans
│                          work-orders · costing · cutting-dispatch
│                          remnants · barcodes · users · purchasing
│                          waste-report · profile
├── components/
│   ├── ui/                shadcn/ui primitives
│   ├── kiosk/             BigButton · ScannerView · LabelPreview · BottomNav
│   └── dashboard/         StatCard · AlertBanner · SideNav
├── lib/
│   ├── api/               typed fetch wrappers per domain
│   ├── hooks/             TanStack Query hooks per domain
│   └── auth/              RBAC — can(role, action, resource)
└── types/api.ts           DTOs aligned to Go backend iface.go
```

---

## Testing

```bash
npm run test:unit          # Vitest + jsdom — component & util tests
npm run test:unit:watch    # Watch mode

npm run test:e2e           # Playwright (requires npm run dev running)
npm run test:e2e:ui        # Interactive Playwright UI

npx vitest --project storybook  # Storybook interaction tests
```

| Suite | Scope |
|---|---|
| Component unit | Cutting card, suggestion card, report-cut form, overflow banner, work-order gate |
| E2E smoke | Auth redirects, kiosk navigation, cutting flow, scan checkpoint, dashboard work order |
| Storybook interaction | `play()` on Button + Header stories |

---

## Feature Surface

### Kiosk (mobile PWA — shop-floor)

- Cutting orders list with pull-to-refresh
- Remnant suggestion modal with bypass confirmation
- Report-cut form: material → lot → sheet cascade
- Domain-rule gates surfaced inline (the API is authoritative; the UI mirrors it for fast feedback)
- Remnant intake — QR location scan
- Browseable remnant inventory
- QR scan + checkpoint recording with wake-lock, vibration, success screen, resume
- Label preview + print PDF

### Dashboard (desktop — office)

- Overview: KPI cards, charts, activity feed, whole-sheet stock widget
- Catalogs: materials, SKUs (with BOM editor)
- Sales: purchase orders, production plans (create / approve / cancel with reason)
- Production: work orders with status advance + assignment, cutting dispatch board
- Inventory: remnants list, filter, allocate, waste; barcode generation + scan history
- Costing: compute, finalize, adjust; pre-cut start gate; waste cost report with CSV export
- Purchasing: material purchase orders
- Admin: user CRUD + active toggle; self-service profile

### Shared / Infrastructure

- Central RBAC policy in `src/lib/auth/`
- Vietnamese domain terminology standardized across UI
- Scan metadata (actor / device) attached to every checkpoint
- CI quality gates — tsc + build + zero-warning lint
- Playwright E2E + Vitest component + Storybook interaction layered tests

---

## RBAC Roles

| Role | Access |
|---|---|
| `admin` | All dashboard modules; user CRUD; create PO/plans/WO; approve/cancel; advance/assign WO; compute & finalize costing; create purchase orders; generate waste report |
| `accountant` | All dashboard read; create PO; compute, finalize, adjust costing; generate waste cost report |
| `planner` | All dashboard read; create + approve + cancel plans; create work orders |
| `warehouse` | All dashboard read; create + cancel material purchase orders |
| `foreman` | Work orders — advance, consume, generate barcodes; profile |
| `cnc_manager` | Work orders read; cutting dispatch — assign; profile |
| `cnc` | Kiosk only — scan, cutting orders, report-cut, remnant list/store, account |

The dashboard groups these into three personas (Worker / Planner / Admin) for nav and route gating; the seven DB roles remain available for finer-grained customer-specific rules.

---

## Key Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint — 0 warnings |
| `npm run test:unit` | Component tests |
| `npm run test:e2e` | E2E tests |
| `npm run storybook` | Storybook dev server |

---

## License

Licensed under [PolyForm Noncommercial 1.0.0](./LICENSE).

- Free for personal use, research, and education.
- Free to fork, modify, and study.
- Commercial use requires a separate license — contact giangdq202@gmail.com.

---

## Tài liệu tiếng Việt

Frontend cho hệ thống MES (Manufacturing Execution System) đang chạy production tại nhà máy xuất khẩu đá & gỗ ở Việt Nam. Build end-to-end với vai trò engineer hợp đồng — code mở để tham khảo kỹ thuật, business logic riêng của khách giữ private theo thỏa thuận.

Một ứng dụng Next.js phục vụ hai đối tượng:

- **Dashboard** (desktop, 1280 px) cho nhân viên văn phòng — kế hoạch, kế toán, owner.
- **Kiosk PWA** (mobile, 375 px, touch ≥ 48 px) cho công nhân xưởng cắt / xử lý.

### Cài đặt & chạy local

```bash
npm install
npm run dev      # http://localhost:3000
```

Cần backend Go chạy song song — xem [Vmarble-Warehouse-Management-Service](https://github.com/giangdq202/Vmarble-Warehouse-Management-Service).

### Repository liên quan

- **Backend (Go):** [`giangdq202/Vmarble-Warehouse-Management-Service`](https://github.com/giangdq202/Vmarble-Warehouse-Management-Service) — Gin · pgx/v5 · PostgreSQL 17
