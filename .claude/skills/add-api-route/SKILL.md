---
name: add-api-route
description: Use when adding a new API domain, new endpoint to an existing domain, or a new TanStack Query hook. Covers the 4-file pattern (api client + types + hook), query key conventions, mutation invalidation, and error handling.
---

# Add API Route & TanStack Query Hook

## Pattern overview — 4 files per domain

```
src/
├── types/api.ts                  ← 1. Add DTO types here (shared with all consumers)
├── lib/api/<domain>.ts           ← 2. API functions (thin wrappers over apiClient)
└── lib/hooks/use-<domain>.ts     ← 3. TanStack Query hooks (consumed by components)
```

The **`apiClient`** base is at `src/lib/api/client.ts` — import from there, never use `fetch` directly.

---

## Step 1 — Add types to `src/types/api.ts`

Mirror the Go backend response types exactly. Use the naming convention from the backend `iface.go`:

```typescript
// src/types/api.ts — append new types here

export interface MyEntity {
  id: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string   // ISO string from Go time.Time — use snake_case to match JSON tags
}

export interface CreateMyEntityInput {
  name: string
}

// Paginated list endpoints return PagedResult<T> (NOT PaginatedResponse — that is @deprecated).
// Shape: { items: T[], total_items: number, total_pages: number, current_page: number, limit: number }
// Always unwrap .items when rendering — never treat PagedResult<T> as T[].
```

**Rules:**
- Dates from the Go API are always `string` (ISO 8601) — parse client-side when needed
- Enums mirror the Go `const` block — use TypeScript string union, not `enum`
- Field names are `snake_case` to match Go JSON tags — do NOT use `camelCase`
- Never declare the same type in two places — always import from `@/types/api`
- Use `PagedResult<T>` (not the `@deprecated PaginatedResponse<T>`) for paginated endpoints

---

## Step 2 — Create `src/lib/api/<domain>.ts`

```typescript
// src/lib/api/my-domain.ts
import type { MyEntity, CreateMyEntityInput, PagedResult } from '@/types/api'
import { apiClient } from './client'

// ── Filter type for list endpoints ────────────────────────────────────────────
export interface MyEntityFilter {
  status?: string
  page?: number
  limit?: number
}

// ── API functions ─────────────────────────────────────────────────────────────
export const myDomainApi = {
  list: (filter: MyEntityFilter = {}) =>
    apiClient.get<PagedResult<MyEntity>>('/my-entities', {
      params: filter as Record<string, string | number | boolean | undefined>,
    }),

  getById: (id: string) =>
    apiClient.get<MyEntity>(`/my-entities/${id}`),

  create: (input: CreateMyEntityInput) =>
    apiClient.post<MyEntity>('/my-entities', input),

  update: (id: string, input: Partial<CreateMyEntityInput>) =>
    apiClient.put<MyEntity>(`/my-entities/${id}`, input),

  delete: (id: string) =>
    apiClient.delete<void>(`/my-entities/${id}`),
}
```

**Rules:**
- Return type for paginated endpoints is always `PagedResult<T>` — never `T[]` or `PaginatedResponse<T>`
- Export a single object `myDomainApi` — all functions are methods on it
- Always import from `./client`, never create a new `fetch` call
- Filter types are declared in the same file (not in `types/api.ts`)
- Use explicit generics: `apiClient.get<PagedResult<MyEntity>>(...)`

---

## Step 3 — Create `src/lib/hooks/use-<domain>.ts`

```typescript
// src/lib/hooks/use-my-domain.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { myDomainApi, type MyEntityFilter } from '@/lib/api/my-domain'
import type { ApiClientError } from '@/lib/api/client'
import type { MyEntity } from '@/types/api'

// ── Query key constants ───────────────────────────────────────────────────────
// Keep keys as constants — prevents typos and helps with invalidation
export const MY_ENTITY_KEY = 'my-entities'

// ── Read hooks ────────────────────────────────────────────────────────────────
export function useMyEntities(filter: MyEntityFilter = {}) {
  return useQuery({
    queryKey: [MY_ENTITY_KEY, filter],
    queryFn: () => myDomainApi.list(filter),
    // data is PagedResult<MyEntity> — always access .items, never treat as array
  })
}

export function useMyEntity(id: string) {
  return useQuery({
    queryKey: [MY_ENTITY_KEY, id],
    queryFn: () => myDomainApi.getById(id),
    enabled: !!id,          // don't run if id is empty
  })
}

// ── Mutation hooks ────────────────────────────────────────────────────────────
export function useCreateMyEntity() {
  const queryClient = useQueryClient()
  return useMutation<MyEntity, ApiClientError, CreateMyEntityInput>({
    mutationFn: myDomainApi.create,
    onSuccess: () => {
      // Invalidate the list so it refetches — always invalidate by root key
      queryClient.invalidateQueries({ queryKey: [MY_ENTITY_KEY] })
    },
  })
}

export function useDeleteMyEntity() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => myDomainApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_ENTITY_KEY] })
    },
  })
}
```

**Query key conventions:**
| Pattern | Use |
|---------|-----|
| `[domain]` | All items in a domain (`invalidateQueries` invalidates everything) |
| `[domain, filter]` | Filtered list (filter object is stable key part) |
| `[domain, id]` | Single entity |
| `[domain, id, 'lineage']` | Subresource of an entity |

**Default query config** (set in `src/lib/providers.tsx`):
- `staleTime: 30_000` (30 s) — data is fresh for 30 seconds
- `gcTime: 5 * 60_000` (5 min) — cache entry lives 5 min after last observer
- `retry: 1` — one automatic retry on failure
- `refetchOnWindowFocus: false` — disable background refetch on tab switch

---

## Step 4 — Use the hook in a component

```tsx
'use client'

import { useMyEntities, useCreateMyEntity } from '@/lib/hooks/use-my-domain'
import { toast } from 'sonner'

export function MyEntityList() {
  const { data, isLoading, error } = useMyEntities({ status: 'ACTIVE' })
  const createMutation = useCreateMyEntity()

  if (isLoading) return <Skeleton className="h-10 w-full" />
  if (error) return <p className="text-destructive">{error.message}</p>

  // IMPORTANT: data is PagedResult<MyEntity> — always unwrap .items
  // data?.data.map(...)  ← WRONG — 'data' field doesn't exist on PagedResult
  // data?.items.map(...) ← CORRECT
  const items = data?.items ?? []

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({ name: 'New entity' })
      toast.success('Tạo thành công')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi không xác định')
    }
  }

  return (
    <ul>
      {items.map((item) => <li key={item.id}>{item.name}</li>)}
    </ul>
  )
}
```

---

## Error handling with `ApiClientError`

```typescript
import { ApiClientError } from '@/lib/api/client'

try {
  await myDomainApi.create(input)
} catch (err) {
  if (err instanceof ApiClientError) {
    if (err.status === 422) {
      // Validation error — err.details is Record<string, string>
      console.log(err.details)
    }
    if (err.status === 409) {
      toast.error('Đã tồn tại — không thể tạo trùng')
    }
  }
}
```

Common Go backend status codes:
- `400` Bad Request (invalid input)
- `404` Not found → maps to Go `domain.ErrNotFound`
- `409` Conflict (duplicate)
- `422` Unprocessable (business rule violation)
- `503` Backend unavailable
