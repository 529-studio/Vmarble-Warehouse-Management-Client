# Vmarble Warehouse Management — Frontend

> **Woodworking furniture workshop** — plywood cutting, intelligent remnant tracking, production planning, QR labelling, costing, and a warehouse dashboard.

**Stack:** [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/) [![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=react-query)](https://tanstack.com/query) [![shadcn/ui](https://img.shields.io/badge/shadcn/ui-black?logo=shadcnui)](https://ui.shadcn.com/) [![Zustand](https://img.shields.io/badge/Zustand-orange)](https://github.com/pmndrs/zustand) [![Playwright](https://img.shields.io/badge/Playwright-green?logo=playwright)](https://playwright.dev/) [![Vitest](https://img.shields.io/badge/Vitest-yellow?logo=vitest)](https://vitest.dev/)

---

## Getting Started

```bash
npm install
npm run dev          # Turbopack dev server — http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint (0 warnings enforced)
```

### Environment

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_API_URL=/api/proxy    # Next.js rewrite proxy to Go backend
BACKEND_URL=http://localhost:8080 # Go backend (server-side only)
```

---

## Architecture

Two fully separate UI experiences share a single Next.js app:

| Route group | Audience | Baseline |
|---|---|---|
| `(kiosk)` | CNC workers — mobile PWA | 375 px, touch ≥ 48 px |
| `(dashboard)` | Managers / planners / accountants | 1280 px, side nav |
| `(auth)` | All users | Login page |

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
│   ├── ui/                shadcn/ui components
│   ├── kiosk/             BigButton · ScannerView · LabelPreview · BottomNav
│   └── dashboard/         StatCard · AlertBanner · SideNav
├── lib/
│   ├── api/               typed fetch wrappers per domain
│   ├── hooks/             TanStack Query hooks per domain
│   └── auth/              RBAC — can(role, action, resource)
└── types/api.ts            DTOs matching Go backend iface.go (snake_case)
```

---

## Testing

```bash
npm run test:unit          # Vitest + jsdom — component & util tests
npm run test:unit:watch    # Watch mode

npm run test:e2e           # Playwright (requires npm run dev running)
npm run test:e2e:ui        # Interactive Playwright UI

npx vitest --project storybook  # Storybook interaction tests (play functions)
```

### Coverage

| Suite | Scope |
|---|---|
| Component unit | `CuttingOrderCard`, `SuggestionCard`, `ReportCutForm`, `OverflowBanner`, `work-order-gate` |
| E2E smoke | Auth redirects, kiosk nav, cutting flow, scan checkpoint, dashboard WO |
| Storybook interaction | `play()` on Button + Header stories |

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

## Feature Status

### Kiosk (mobile PWA — CNC worker)

| Feature | Status |
|---|---|
| Cutting orders list + pull-to-refresh | Done |
| Remnant suggestion modal (Best Fit + FIFO) | Done |
| Report cut form — material → lot → sheet cascade | Done |
| Area conservation gate (BR-K03) | Done |
| Remnant store — QR location scan | Done |
| Remnant list (browse inventory) | Done |
| QR scan + checkpoint recording | Done |
| Scan UX — wake lock, vibration, success screen, resume | Done |
| Label preview + print PDF (in-tem flow) | Done |
| Mobile UX audit & polish | Done |

### Dashboard (desktop — managers, planners, accountants)

| Feature | Status |
|---|---|
| Overview — KPI cards, charts, activity feed | Done |
| Materials catalog — list & create | Done |
| SKU catalog — list, create & BOM editor | Done |
| Purchase Orders — list & create | Done |
| Production Plans — list, create & approve | Done |
| Work Orders — list, create, advance status, assign | Done |
| Cutting Dispatch — default `PLANNED` + unassigned filter | Done |
| Remnants — list, filter, allocate, waste | Done |
| Barcodes — generate, scan history | Done |
| Costing — compute, finalize, adjustment (BR-C01–C04) | Done |
| Costing pre-cut gate — block start without finalized cost | Done |
| Waste cost report — filter, chart, CSV export (BR-C03) | Done |
| Purchasing — material purchase orders list & create | Done |
| Whole-sheet stock widget on overview | Done |
| Scan Event History — checkpoint timeline | Done |
| Remnant suggestions in WO create dialog (BR-K05) | Done |
| Remnant bypass confirmation modal (BR-K05) | Done |
| Consumption record per WO — auxiliary/metal (BR-P03/P04) | Done |
| User profile page (self-service) | Done |
| Admin — User Management CRUD + active toggle | Done |

### Shared / Infrastructure

| Feature | Status |
|---|---|
| RBAC — `can(role, action, resource)` central policy | Done |
| Kiosk account profile (self-service password change) | Done |
| Vietnamese domain terminology standardization | Done |
| Scan metadata (actor / device) attached to scans | Done |
| CI quality gates — tsc + build | Done |
| Playwright E2E setup + smoke tests | Done |
| Component tests — Testing Library + Vitest | Done |

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

---

## Related Repositories

- **Backend (Go):** `giangdq202/Vmarble-Warehouse-Management` — Gin · pgx/v5 · PostgreSQL 17

---

---

# Vmarble Quản lý Kho — Frontend

> **Xưởng gỗ nội thất** — quản lý cắt ván ép, tái sử dụng tấm lẻ thông minh, lập kế hoạch sản xuất, dán tem QR, tính giá thành và dashboard kho hàng.

**Stack:** [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/) [![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/) [![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=react-query)](https://tanstack.com/query) [![shadcn/ui](https://img.shields.io/badge/shadcn/ui-black?logo=shadcnui)](https://ui.shadcn.com/) [![Zustand](https://img.shields.io/badge/Zustand-orange)](https://github.com/pmndrs/zustand) [![Playwright](https://img.shields.io/badge/Playwright-green?logo=playwright)](https://playwright.dev/) [![Vitest](https://img.shields.io/badge/Vitest-yellow?logo=vitest)](https://vitest.dev/)

---

## Khởi động

```bash
npm install
npm run dev          # Dev server Turbopack — http://localhost:3000
npm run build        # Build production
npm run lint         # ESLint (0 warning)
```

### Cấu hình môi trường

Sao chép `.env.example` thành `.env.local` và điền:

```env
NEXT_PUBLIC_API_URL=/api/proxy    # Proxy Next.js → Go backend
BACKEND_URL=http://localhost:8080 # Backend Go (chỉ server-side)
```

---

## Kiến trúc

Hai giao diện hoàn toàn độc lập trên cùng một ứng dụng Next.js:

| Route group | Đối tượng | Baseline |
|---|---|---|
| `(kiosk)` | Công nhân CNC — mobile PWA | 375 px, touch ≥ 48 px |
| `(dashboard)` | Quản lý / kế hoạch / kế toán | 1280 px, side nav |
| `(auth)` | Tất cả | Trang đăng nhập |

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
│   ├── ui/                shadcn/ui
│   ├── kiosk/             BigButton · ScannerView · LabelPreview · BottomNav
│   └── dashboard/         StatCard · AlertBanner · SideNav
├── lib/
│   ├── api/               wrapper fetch có type per domain
│   ├── hooks/             TanStack Query hooks per domain
│   └── auth/              RBAC — can(role, action, resource)
└── types/api.ts            DTOs khớp với Go backend iface.go (snake_case)
```

---

## Kiểm thử

```bash
npm run test:unit          # Vitest + jsdom — component & util tests
npm run test:unit:watch    # Watch mode

npm run test:e2e           # Playwright (cần npm run dev đang chạy)
npm run test:e2e:ui        # Playwright UI mode tương tác

npx vitest --project storybook  # Storybook interaction tests (hàm play)
```

### Phạm vi kiểm thử

| Bộ test | Phạm vi |
|---|---|
| Component unit | `CuttingOrderCard`, `SuggestionCard`, `ReportCutForm`, `OverflowBanner`, `work-order-gate` |
| E2E smoke | Auth redirect, nav kiosk, luồng cắt, scan checkpoint, dashboard WO |
| Storybook interaction | `play()` trên Button + Header story |

---

## Tính năng theo tiến độ

### Kiosk (PWA mobile — công nhân CNC)

| Tính năng | Trạng thái |
|---|---|
| Danh sách lệnh cắt + kéo để làm mới | Hoàn thành |
| Modal gợi ý tấm lẻ (Best Fit + FIFO) | Hoàn thành |
| Form báo cáo cắt — cascade vật liệu → lô → tấm | Hoàn thành |
| Chặn vi phạm bảo toàn diện tích (BR-K03) | Hoàn thành |
| Nhập kho tấm lẻ — quét QR vị trí kho | Hoàn thành |
| Danh sách tấm lẻ (duyệt kho) | Hoàn thành |
| Quét QR + ghi nhận điểm kiểm tra | Hoàn thành |
| UX quét — wake lock, rung, màn hình thành công, resume | Hoàn thành |
| Xem trước tem + in PDF (luồng in tem) | Hoàn thành |
| Kiểm tra UX mobile toàn diện | Hoàn thành |

### Dashboard (desktop — quản lý, kế hoạch, kế toán)

| Tính năng | Trạng thái |
|---|---|
| Tổng quan — KPI card, biểu đồ, nhật ký hoạt động | Hoàn thành |
| Danh mục nguyên liệu — danh sách & tạo mới | Hoàn thành |
| Danh mục SKU — danh sách, tạo & BOM editor | Hoàn thành |
| Đơn hàng (PO) — danh sách & tạo | Hoàn thành |
| Kế hoạch sản xuất — danh sách, tạo & duyệt | Hoàn thành |
| Lệnh sản xuất — danh sách, tạo, chuyển trạng thái, phân công | Hoàn thành |
| Điều phối cắt — mặc định lọc `PLANNED` + chưa phân công | Hoàn thành |
| Tấm lẻ — danh sách, lọc, cấp phát, hủy | Hoàn thành |
| Mã vạch — tạo tem, lịch sử quét | Hoàn thành |
| Tính giá thành — tính, chốt, điều chỉnh (BR-C01–C04) | Hoàn thành |
| Chặn bắt đầu cắt khi chưa chốt giá thành | Hoàn thành |
| Báo cáo hao hụt — bộ lọc, biểu đồ, xuất CSV (BR-C03) | Hoàn thành |
| Đơn nhập vật liệu — danh sách & tạo mới | Hoàn thành |
| Widget tấm nguyên theo vật liệu trên tổng quan | Hoàn thành |
| Lịch sử quét điểm kiểm tra | Hoàn thành |
| Gợi ý tấm lẻ trong dialog tạo WO (BR-K05) | Hoàn thành |
| Modal xác nhận bỏ qua tấm lẻ (BR-K05) | Hoàn thành |
| Nhập tiêu hao vật tư phụ/metal theo WO (BR-P03/P04) | Hoàn thành |
| Trang hồ sơ người dùng (tự cập nhật) | Hoàn thành |
| Admin — Quản lý người dùng CRUD + bật/tắt hoạt động | Hoàn thành |

### Dùng chung / Hạ tầng

| Tính năng | Trạng thái |
|---|---|
| RBAC — policy tập trung `can(role, action, resource)` | Hoàn thành |
| Hồ sơ kiosk (tự đổi mật khẩu) | Hoàn thành |
| Chuẩn hóa thuật ngữ tiếng Việt theo nghiệp vụ | Hoàn thành |
| Metadata quét (actor / thiết bị) gắn vào scan | Hoàn thành |
| CI quality gates — tsc + build | Hoàn thành |
| Setup Playwright E2E + smoke tests | Hoàn thành |
| Component tests — Testing Library + Vitest | Hoàn thành |

---

## Phân quyền RBAC

| Role | Quyền truy cập |
|---|---|
| `admin` | Toàn bộ module dashboard; CRUD người dùng; tạo PO/kế hoạch/WO; duyệt/hủy; chuyển trạng thái & phân công WO; tính & chốt giá thành; tạo đơn nhập vật liệu; xuất báo cáo hao hụt |
| `accountant` | Đọc toàn bộ dashboard; tạo PO; tính, chốt, điều chỉnh giá thành; xuất báo cáo hao hụt |
| `planner` | Đọc toàn bộ dashboard; tạo + duyệt + hủy kế hoạch; tạo lệnh sản xuất |
| `warehouse` | Đọc toàn bộ dashboard; tạo + hủy đơn nhập vật liệu |
| `foreman` | Lệnh sản xuất — chuyển trạng thái, ghi tiêu hao, in tem; hồ sơ |
| `cnc_manager` | Đọc lệnh sản xuất; điều phối cắt — phân công; hồ sơ |
| `cnc` | Chỉ kiosk — quét, lệnh cắt, báo cáo cắt, tấm lẻ, tài khoản |

---

## Repository liên quan

- **Backend (Go):** `giangdq202/Vmarble-Warehouse-Management` — Gin · pgx/v5 · PostgreSQL 17
# Test deployment
