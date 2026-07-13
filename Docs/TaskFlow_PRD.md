# TaskFlow — Product Requirements Document (PRD)

**Version:** 1.0
**Status:** Draft
**Document owner:** Product/Engineering

---

## 1. Overview

TaskFlow is a modern, collaborative project management platform that enables teams to organize work, manage projects, assign tasks, track progress through a Kanban board, and collaborate in real time.

It targets small teams and groups — students, clubs, freelancers, startups, and small dev teams — who currently rely on scattered tools (spreadsheets, chat apps, notes) and suffer from poor visibility, missed deadlines, and fragmented collaboration.

## 2. Problem Statement

| Current Pain Point | Impact |
|---|---|
| No centralized task list | Work gets duplicated or dropped |
| Deadlines tracked in chat/DMs | Missed or forgotten due dates |
| No shared visual of project status | Team leads can't tell what's blocked |
| Feedback scattered across tools | Context lost, decisions untracked |
| No permission structure | Anyone can edit/delete anything |

TaskFlow consolidates project structure, task ownership, communication, and progress tracking into one workspace.

## 3. Target Users & Personas

| Persona | Description | Key Need |
|---|---|---|
| **Student (Contributor)** | Group project member | See what's assigned to them, mark done |
| **Club/Team Lead (Admin)** | Organizes club activities or a small team | Assign tasks, track overall progress |
| **Freelancer** | Manages multiple client projects solo or with collaborators | Fast project switching, deadline visibility |
| **Startup/Dev Team Member** | Engineer or PM on a small team | Kanban workflow, comments, real-time sync |

## 4. Goals & Success Metrics

| Goal | Success Metric |
|---|---|
| Secure authentication | 0 unauthorized data access incidents; <2s login time |
| Project & workspace management | Users can create a workspace + project in <60s |
| Kanban board | Drag-and-drop task move reflected in <300ms |
| Role-based access | 3 roles enforced with zero permission leaks in QA |
| Task assignment | 100% of tasks have an assignee + due date field available |
| Comments & collaboration | Comment thread per task, notifications on mention |
| Real-time updates | Board updates visible to all active users within 1s |
| Analytics dashboard | Task completion rate, overdue count, per-member load visible |

## 5. Non-Goals (Out of Scope for v1)

- Native mobile apps (responsive web only in v1)
- Time tracking / billing / invoicing
- Gantt chart / resource-leveling views
- Third-party integrations (Slack, GitHub, etc.) — planned for v2
- Offline-first support

---

## 6. Functional Requirements

### 6.1 Authentication & Account Management
- Email/password signup with verification email
- OAuth login (Google minimum; GitHub optional for dev-team appeal)
- Password reset flow
- JWT-based session management with refresh tokens
- Optional: 2FA (stretch goal)

**Acceptance criteria**
- Passwords hashed (bcrypt/argon2), never stored in plaintext
- Sessions expire and refresh securely
- Rate limiting on login attempts

### 6.2 Workspace & Project Management
- A **Workspace** contains multiple **Projects** and a member list
- Users can create/rename/delete workspaces they own
- Users can create/archive/delete projects within a workspace
- Invite members to a workspace via email or shareable invite link
- Each project has: name, description, status (active/archived), created date, owner

### 6.3 Kanban Board
- Default columns: `To Do`, `In Progress`, `In Review`, `Done` (customizable per project)
- Drag-and-drop tasks between columns and reorder within a column
- Create/edit/delete columns
- Task cards show: title, assignee avatar, due date, labels/tags, priority
- Filter/search board by assignee, label, or priority

### 6.4 Role-Based Access Control (RBAC)
| Role | Permissions |
|---|---|
| **Owner/Admin** | Full control: manage members, roles, projects, delete workspace |
| **Member** | Create/edit/move tasks, comment, view analytics |
| **Viewer** | Read-only access to boards and analytics |

- Roles assigned per workspace (and optionally overridden per project)
- Permission checks enforced server-side on every mutating request

### 6.5 Task Management & Assignment
- Task fields: title, description (rich text), assignee(s), due date, priority (Low/Med/High/Urgent), labels, checklist/sub-tasks, attachments
- Assign a task to one or more members
- Notifications sent to assignee on assignment/due-date approaching
- Task activity log (who changed what, when)

### 6.6 Comments & Collaboration
- Threaded comments per task
- @mention team members (triggers notification)
- Markdown-lite formatting support in comments
- Edit/delete own comments; admins can moderate

### 6.7 Real-Time Updates
- WebSocket-based sync: board changes, new comments, and assignments propagate live to all connected clients in the project
- Presence indicators (who's currently viewing/editing a task)
- Optimistic UI updates with conflict resolution on drag-and-drop

### 6.8 Analytics Dashboard
- Per-project: task completion rate, overdue tasks, tasks by status (pie/bar chart)
- Per-member: workload (open tasks assigned), completion rate
- Timeline view: tasks completed over time (line chart)
- Exportable summary (CSV/PDF — stretch goal)

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Board interactions respond in <300ms; API p95 <500ms |
| **Scalability** | Support workspaces up to ~100 members, ~50 projects each (v1 target) |
| **Availability** | 99.5% uptime target |
| **Security** | HTTPS everywhere, RBAC enforced server-side, input sanitization, OWASP Top 10 mitigations |
| **Data Privacy** | User data deletable on request; comply with basic GDPR-style data export/delete |
| **Accessibility** | WCAG 2.1 AA for core flows (keyboard nav, contrast, ARIA labels) |
| **Browser Support** | Latest 2 versions of Chrome, Firefox, Safari, Edge |
| **Responsiveness** | Fully usable on tablet and mobile web (375px+ width) |

---

## 8. Suggested Technical Architecture

### 8.1 Tech Stack (recommended)
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React (or Next.js) + TypeScript | Component reuse, strong ecosystem, SSR option |
| State/Data | React Query / Zustand | Simple, works well with real-time sync |
| Styling | Tailwind CSS | Fast iteration, consistent design system |
| Backend | Node.js (Express/Fastify) or Django | Team familiarity dependent; Node pairs well with WebSockets |
| Database | PostgreSQL | Relational integrity for projects/tasks/roles |
| Real-time | WebSockets (Socket.IO) or Pusher/Ably (managed) | Live board sync, presence |
| Auth | JWT + OAuth (Auth0 or custom) | Balance of control vs. speed |
| File storage | S3-compatible (attachments, avatars) | Standard, cheap |
| Hosting | Vercel/Netlify (frontend) + Render/Railway/AWS (backend) | Fast to deploy for a small team's scale |

### 8.2 High-Level System Diagram (described)
```
Client (React SPA)
   │  REST/GraphQL + WebSocket
   ▼
API Gateway / Backend (Node.js)
   │
   ├── Auth Service (JWT, OAuth)
   ├── Workspace/Project Service
   ├── Task Service
   ├── Comment/Notification Service
   ├── Analytics Service
   ▼
PostgreSQL  +  Redis (pub/sub for WebSocket scaling, caching)
   ▼
S3 (attachments/avatars)
```

### 8.3 Core Data Model (entities)
- **User**(id, name, email, password_hash, avatar_url, created_at)
- **Workspace**(id, name, owner_id, created_at)
- **WorkspaceMember**(workspace_id, user_id, role)
- **Project**(id, workspace_id, name, description, status, created_at)
- **Board**(id, project_id) — 1:1 with project for v1
- **Column**(id, board_id, name, order)
- **Task**(id, column_id, title, description, priority, due_date, order, created_at)
- **TaskAssignee**(task_id, user_id)
- **Comment**(id, task_id, user_id, body, created_at)
- **Notification**(id, user_id, type, payload, read_at, created_at)
- **ActivityLog**(id, task_id, user_id, action, created_at)

---

## 9. Suggested Roadmap / Phases

| Phase | Scope | Est. Duration |
|---|---|---|
| **Phase 1 — Foundation** | Auth, workspace/project CRUD, basic Kanban board (no real-time) | 2–3 weeks |
| **Phase 2 — Collaboration** | RBAC, task assignment, comments, notifications | 2 weeks |
| **Phase 3 — Real-Time** | WebSocket sync, presence, optimistic UI | 1–2 weeks |
| **Phase 4 — Analytics & Polish** | Dashboard, charts, accessibility pass, responsive QA | 1–2 weeks |
| **Phase 5 — Beta & Hardening** | Security review, load testing, bug fixes | 1 week |

*(Timeline assumes a small team of 2–4 developers working part-time; adjust to your actual team size/availability.)*

---

## 10. Risks & Open Questions

- **Real-time scaling**: Will a single WebSocket server suffice, or is Redis pub/sub needed from day one? → Depends on concurrent-user targets.
- **Mobile strategy**: Is responsive web enough for launch, or does target audience expect a native app sooner?
- **Notification delivery**: In-app only, or also email/push? Affects infra complexity.
- **Multi-tenancy model**: Should a user belong to multiple workspaces (likely yes) — confirm data isolation approach.
- **Free vs. paid tiers**: Is monetization in scope, or is this purely a free tool for now?

---

## 11. Appendix — Feature Priority (MoSCoW)

| Feature | Priority |
|---|---|
| Auth (email + Google OAuth) | Must |
| Workspace/Project CRUD | Must |
| Kanban board with drag-and-drop | Must |
| RBAC (3 roles) | Must |
| Task assignment + due dates | Must |
| Comments | Must |
| Real-time sync | Should |
| Analytics dashboard | Should |
| Notifications (in-app) | Should |
| Email notifications | Could |
| File attachments | Could |
| 2FA | Could |
| Third-party integrations | Won't (v1) |
