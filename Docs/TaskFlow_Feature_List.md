# TaskFlow — Feature List

Organized by module, with MoSCoW priority and release phase mapping.

## Legend
- **Priority:** Must / Should / Could / Won't (v1)
- **Phase:** Maps to Project Roadmap phases 1–5

---

## 1. Authentication & Accounts

| Feature | Priority | Phase |
|---|---|---|
| Email/password signup with verification | Must | 1 |
| Google OAuth login | Must | 1 |
| Password reset via email | Must | 1 |
| JWT session with refresh token | Must | 1 |
| Login rate limiting | Must | 1 |
| Two-factor authentication (2FA) | Could | 5 |
| GitHub OAuth login | Could | 5 |

## 2. Workspace & Project Management

| Feature | Priority | Phase |
|---|---|---|
| Create/rename/delete workspace | Must | 1 |
| Invite members via email | Must | 1 |
| Invite members via shareable link | Should | 2 |
| Create/archive/delete projects | Must | 1 |
| Multiple workspace membership per user | Must | 1 |
| Workspace-level settings page | Could | 4 |

## 3. Kanban Board

| Feature | Priority | Phase |
|---|---|---|
| Default columns on project creation | Must | 1 |
| Drag-and-drop task move between columns | Must | 1 |
| Reorder tasks within a column | Must | 1 |
| Create/rename/delete/reorder columns | Must | 1 |
| Filter board by assignee/label/priority | Should | 2 |
| Search tasks by keyword | Should | 2 |
| Swimlanes (grouping by assignee) | Could | 5 |

## 4. Roles & Permissions

| Feature | Priority | Phase |
|---|---|---|
| Owner/Admin, Member, Viewer roles | Must | 1 |
| Server-side permission enforcement | Must | 1 |
| Role assignment/change by Admin | Must | 2 |
| Per-project role override | Could | 5 |

## 5. Task Management

| Feature | Priority | Phase |
|---|---|---|
| Create/edit/delete tasks | Must | 1 |
| Assign task to one or more members | Must | 2 |
| Due dates and priority levels | Must | 1 |
| Labels/tags | Should | 2 |
| Checklist/sub-tasks | Should | 2 |
| File attachments | Should | 4 |
| Task activity log | Should | 2 |
| Due-date reminder notifications | Should | 2 |

## 6. Comments & Collaboration

| Feature | Priority | Phase |
|---|---|---|
| Threaded comments per task | Must | 2 |
| @mentions with notification | Should | 2 |
| Markdown-lite formatting | Could | 2 |
| Comment edit/delete | Should | 2 |
| Admin comment moderation | Could | 4 |

## 7. Real-Time Collaboration

| Feature | Priority | Phase |
|---|---|---|
| Live board sync via WebSocket | Should | 3 |
| Presence indicators | Could | 3 |
| Conflict resolution on simultaneous edits | Should | 3 |
| Polling fallback if WebSocket unavailable | Should | 3 |

## 8. Analytics Dashboard

| Feature | Priority | Phase |
|---|---|---|
| Task count by status (chart) | Should | 4 |
| Overdue task list | Should | 4 |
| Per-member workload view | Should | 4 |
| Completion trend over time | Should | 4 |
| CSV/PDF export | Could | 5 |

## 9. Explicitly Out of Scope (v1)

| Feature | Status |
|---|---|
| Native mobile apps | Won't (v1) |
| Time tracking / billing | Won't (v1) |
| Gantt chart / resource leveling | Won't (v1) |
| Third-party integrations (Slack, GitHub, Calendar) | Won't (v1) |
| Offline-first editing | Won't (v1) |
| Multi-language (i18n) | Won't (v1) |
