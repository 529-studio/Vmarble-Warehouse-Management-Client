# Gemini CLI Guidance — VMARBLE Frontend

This file mandates the behavior of Gemini CLI to ensure high-quality, responsive, and business-accurate Frontend development for the VMARBLE WMS.

## 🛠 Skill Discovery (Claude Compatibility)
Gemini does not trigger skills automatically. Instead, you MUST manually "load" the expert guidance for the current task:
1. **Identify**: Check `.claude/skills/` for a relevant subfolder.
2. **Read**: Use `read_file` on the `SKILL.md` inside that folder.
3. **Adopt**: Treat the instructions in that file as **Foundation Mandates** for the rest of the session.

---

## 🛠 Active Skills

| Skill | Activation Trigger |
|-------|--------------------|
| `senior-workflow-frontend` | **Mandatory** for any new page, component, or logic. Follow Phases 1-6. |
| `business-auditor` | Validation of UI terminology or logic against `docs/` (e.g., remnant flow). |
| `product-manager` | Frontend backlog management, responsive design task breakdown. |
| `integration-architect` | Syncing `types/api.ts` with Backend or updating API hooks. |
| `kiosk-component` / `add-page` | Building mobile-first factory UI or new routes. |

---

## 🤖 Automation Workflow (Trigger: "Làm task tiếp theo")

When triggered, follow this sequence without further instruction:

1. **Fetch**: Run `gh issue list --limit 1` to find the latest frontend task.
2. **Analyze**: Run `gh issue view <id>` to understand UI requirements and Responsive targets.
3. **Audit**: Invoke `business-auditor`. Ensure Vietnamese terminology matches the workshop spec (e.g., "Tấm lẻ", "Hao hụt").
4. **Implement**: Activate `senior-workflow-frontend`. 
   - *Example Issue Title*: `[kiosk] Thêm màn hình báo cáo tấm lẻ dư (BR-K04)`
   - *Example Issue Description*: `Tạo form nhập bounding box cho thợ CNC sau khi cắt. Cần responsive mobile 375px.`
5. **Architect**: Use `integration-architect` to verify `snake_case` alignment with Backend `iface.go`.

---

## 📱 UX & Architecture Rules
- **Kiosk Mode**: Mobile-first (375px baseline), min touch target **48px**, Vietnamese labels ONLY.
- **4-File Pattern**: New domains MUST follow: `types/api.ts` -> `lib/api/` -> `lib/hooks/` -> `app/`.
- **States**: Every page must handle **Loading** (Skeleton), **Error**, and **Empty** states.
- **Snake Case**: Always match Go JSON tags. Use `PagedResult<T>` for lists.

---

## 🚀 Commands
- `npm run dev`: Start Turbopack dev server.
- `npx tsc --noEmit`: **Required** before any PR to check types.
- `npm run build`: The ultimate gatekeeper — always run last.
