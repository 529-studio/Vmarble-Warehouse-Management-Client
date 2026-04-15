---
name: integration-architect
description: Use to ensure absolute sync between Frontend and Backend. Checks API contracts, Type safety, and data flow.
---

# Integration Architect - Client-Server Sync

Acts as the gatekeeper to ensure the Client never breaks due to Backend changes.

## Contract Synchronization
1. **Single Source of Types**: Always cross-reference `src/types/api.ts` with the Backend's `iface.go`.
2. **Snake Case Consistency**: Use **snake_case** for all DTOs to match Go JSON tags, avoiding manual renaming errors.
3. **Status Enums**: Ensure FE string unions (e.g., `AVAILABLE`, `IN_CUTTING`) match the Backend `internal/domain` constants 1:1.

## Integration Checks
- **Mutation Invalidation**: After actions like `allocateRemnant`, ensure the correct Query Keys are invalidated to prevent stale UI data.
- **Scanner Payload**: Verify the JSON structure in QR codes matches between BE generation and FE `ScannerView` parsing.

## Integration Checklist
- [ ] Is the API base URL correctly configured for the environment?
- [ ] Are Backend `BizError` messages displayed in a user-friendly way?
- [ ] Are date strings from the API safely handled/formatted?

---
*Goal: Achieve end-to-end type safety from the Database to the UI Component.*
