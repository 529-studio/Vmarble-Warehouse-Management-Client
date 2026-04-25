---
name: product-manager
description: >
  Use to analyze the backlog from a user perspective (Kiosk/Dashboard), break down tasks, manage FE issues, and drive next-task triage when the user says "Làm task tiếp theo", "task tiếp theo", "Start next task", or asks Codex to pick an issue from the GitHub Projects Kanban board. In that trigger flow, identify the highest-priority open issue first, then hand the selected issue into the audit and implementation workflow.
---

# Product Manager - Frontend Backlog & UX

Focus on translating business rules into concrete UI tasks and user stories.

## Core responsibilities
1. Compare specs with current screens and identify missing UI behavior, pages, buttons, validations, and feedback states.
2. Draft FE issues with responsive requirements for 375px / 768px / 1280px.
3. Break work into the sequence: Types -> API Client -> Hooks -> Components -> Pages.
4. Triage the next task when the user asks Codex to continue with the backlog.

## Next-task triage workflow

Use this flow when the user says "Làm task tiếp theo", "task tiếp theo", "Start next task", or asks to pick the next GitHub Projects Kanban item.

### 1. Select the issue
If the user already supplied an issue number or a board item, use it directly.

Otherwise fetch the highest-priority open issue assigned to the current user:

```bash
gh issue list --repo giangdq202/Vmarble-Warehouse-Management-Service   --assignee @me --state open --json number,title,labels   | jq 'sort_by(.labels[].name) | .[0]'
```

### 2. Produce a triage summary
For the chosen issue, summarize:
- Issue number and title
- Priority signal from labels
- User persona: kiosk worker or dashboard manager
- Expected route/module area
- Dependencies or blockers visible from the issue text

### 3. Hand off cleanly
After selecting the issue, pass control to:
- `business-auditor` for BR-* mapping
- `senior-workflow` for requirements-first implementation
- `integration-architect` if the issue changes backend contracts

## FE issue drafting workflow

Draft FE issues in Vietnamese when creating or refining board items.

**Example issue title**: `3.6 [kiosk] Thêm màn hình báo cáo tấm lẻ dư (BR-K04)`

**Example issue body**:
```markdown
## Tóm tắt
Cần bổ sung màn hình cho phép thợ CNC nhập kích thước tấm lẻ sau khi cắt xong lệnh.

## Định nghĩa hoàn thành (DoD)
- [ ] Tạo page mới tại (kiosk)/report-remnant/page.tsx.
- [ ] Responsive tốt trên mobile (375px), touch target tối thiểu 48px.
- [ ] Sử dụng BigButton cho hành động "Xác nhận nhập kho".
- [ ] Hiển thị thông báo thành công (toast.success) sau khi gọi API thành công.
```

## Execution
```bash
gh issue create --title "[kiosk] Thêm màn hình báo cáo tấm lẻ dư (BR-K04)" --body "..."
```

---
*Agent tip: Prioritize one-hand operation for kiosk tasks to accommodate workers on the shop floor.*
