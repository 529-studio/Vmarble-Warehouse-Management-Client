---
name: integration-architect
description: Use to ensure absolute sync between frontend and backend. Invoke this skill in the next-task automation flow whenever the selected issue introduces a new endpoint, modifies an existing DTO mirrored from iface.go, changes request/response fields, or adds a new backend-facing interface such as deps.go. Verify contract consistency before merge.
---

# Integration Architect - Client-Server Sync

Act as the contract gatekeeper so the client never drifts from backend behavior.

## When to run this skill
Run it whenever the task:
- Introduces a new endpoint
- Changes an existing endpoint contract
- Updates frontend DTOs mirrored from backend `iface.go`
- Adds or changes a backend-facing interface such as `deps.go`
- Alters query invalidation, scanner payloads, or data-flow assumptions tied to backend responses

## Contract synchronization rules
1. Cross-reference `src/types/api.ts` with backend `iface.go` before finalizing types.
2. Preserve Go `snake_case` field names exactly.
3. Keep enum/string-union values aligned 1:1 with backend domain constants.
4. Treat Go pointer fields and optional JSON fields as nullable/optional in TypeScript.

## BE swagger annotation check — do this before `npm run gen:api`

A Go handler can parse query params perfectly at runtime while `swag` generates *no* documentation for them, because `swag` only reads `// @Param` annotations — not the code that reads `c.Query(...)`. If annotations are missing, `make swagger` produces a swagger.json that silently omits those params, and `npm run gen:api` produces FE types that also omit them.

**Checklist before running `npm run gen:api`:**

1. Open the relevant handler file in the BE repo. Find the handler function for the endpoint being changed.
2. Verify there is a `// @Param` line above the function **for every query param** the function reads via `c.Query(...)`.
   ```go
   // ❌ Handler reads c.Query("cutoff_from") but has no annotation → swag ignores it
   func (h *Handler) listVessels(c *gin.Context) {
       f.CutoffFrom = c.Query("cutoff_from")
   
   // ✅ Annotation present → swag picks it up
   // @Param  cutoff_from  query  string  false  "cutoff_date >= (YYYY-MM-DD)"
   func (h *Handler) listVessels(c *gin.Context) {
   ```
3. After adding or verifying annotations, run `make swagger` in the BE repo.
4. **Grep-verify** before moving to the FE:
   ```bash
   grep -A 5 '"name": "cutoff_from"' docs/swagger.json
   # Must return a result — if empty, the annotation is still missing or malformed
   ```
5. Commit the updated `docs/swagger.json` to the BE repo.
6. Only then run `npm run gen:api` in the FE repo and commit the regenerated types.

Skipping step 4 means a silent failure: `gen:api` runs fine but produces types that lack the new params.

## Integration checks
- Confirm request and response DTOs still match backend JSON shape.
- Confirm TanStack Query hooks consume paged vs non-paged payloads correctly.
- Confirm query invalidation still covers every stale view after mutation success.
- Confirm scanner/QR payload shape remains compatible between backend generation and frontend parsing.
- Confirm backend `BizError` messages are surfaced safely and usefully in the UI.

## Required output
Provide a short contract review covering:
- Endpoints touched
- DTOs touched
- Optional / nullable fields that need guarding
- Query keys or invalidations that must change
- Remaining contract risks before merge

## Final checklist
- [ ] Does `src/types/api.ts` still mirror backend `iface.go` exactly where applicable?
- [ ] Do hooks unwrap `PagedResult<T>` correctly where needed?
- [ ] Do new or changed mutations invalidate the right query keys?
- [ ] Are date strings and nullable fields guarded before rendering?
- [ ] Did `grep` on swagger.json confirm all new params are present before running `gen:api`?

---
*Goal: maintain end-to-end type safety from backend contract to UI component.*

