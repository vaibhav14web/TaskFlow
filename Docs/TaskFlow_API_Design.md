# TaskFlow — API Design

**Style:** REST, JSON payloads, versioned under `/api/v1`
**Auth:** Bearer JWT in `Authorization` header unless noted

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Base URL | `https://api.taskflow.app/api/v1` |
| Auth header | `Authorization: Bearer <access_token>` |
| Success envelope | `{ "data": ..., "meta": {...} }` |
| Error envelope | `{ "error": { "code": "...", "message": "..." } }` |
| Pagination | `?page=1&limit=25` → `meta.total`, `meta.page`, `meta.limit` |
| Timestamps | ISO 8601 UTC |
| IDs | UUID v4 |

## 2. Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create account (email/password) | None |
| POST | `/auth/verify-email` | Verify email via token | None |
| POST | `/auth/login` | Email/password login → tokens | None |
| POST | `/auth/oauth/google` | Google OAuth login/link | None |
| POST | `/auth/refresh` | Exchange refresh token for new access token | Refresh token |
| POST | `/auth/logout` | Invalidate current session | Bearer |
| POST | `/auth/password-reset/request` | Send reset email | None |
| POST | `/auth/password-reset/confirm` | Set new password via token | None |

**Example — POST `/auth/login`**
```json
Request:
{ "email": "user@example.com", "password": "••••••••" }

Response 200:
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "user": { "id": "uuid", "name": "Priya Sharma", "email": "user@example.com" }
  }
}
```

## 3. Workspaces

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/workspaces` | List workspaces current user belongs to | Any authenticated |
| POST | `/workspaces` | Create a workspace | Any authenticated |
| GET | `/workspaces/:id` | Get workspace details | Member+ |
| PATCH | `/workspaces/:id` | Rename workspace | Admin |
| DELETE | `/workspaces/:id` | Delete workspace | Admin (Owner) |
| GET | `/workspaces/:id/members` | List members + roles | Member+ |
| POST | `/workspaces/:id/invites` | Invite member (email or link) | Admin |
| PATCH | `/workspaces/:id/members/:userId` | Change member role | Admin |
| DELETE | `/workspaces/:id/members/:userId` | Remove member | Admin |

## 4. Projects

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/workspaces/:workspaceId/projects` | List projects | Member+ |
| POST | `/workspaces/:workspaceId/projects` | Create project | Admin |
| GET | `/projects/:id` | Get project details | Member+ |
| PATCH | `/projects/:id` | Update project (name, description, status) | Admin |
| DELETE | `/projects/:id` | Delete project | Admin |

## 5. Board, Columns & Tasks

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/projects/:id/board` | Get board with columns + tasks | Viewer+ |
| POST | `/projects/:id/columns` | Create column | Member+ |
| PATCH | `/columns/:id` | Rename/reorder column | Member+ |
| DELETE | `/columns/:id` | Delete column | Admin |
| GET | `/columns/:id/tasks` | List tasks in column | Viewer+ |
| POST | `/columns/:id/tasks` | Create task | Member+ |
| GET | `/tasks/:id` | Get task detail | Viewer+ |
| PATCH | `/tasks/:id` | Update task fields (incl. move: `column_id`, `order`) | Member+ |
| DELETE | `/tasks/:id` | Delete task | Member+ (or Admin, per policy) |
| POST | `/tasks/:id/assignees` | Assign user to task | Member+ |
| DELETE | `/tasks/:id/assignees/:userId` | Unassign user | Member+ |
| POST | `/tasks/:id/checklist` | Add checklist item | Member+ |
| PATCH | `/checklist/:id` | Toggle/edit checklist item | Member+ |
| POST | `/tasks/:id/attachments` | Upload attachment (multipart) | Member+ |
| GET | `/tasks/:id/activity` | Get activity log | Viewer+ |

**Example — PATCH `/tasks/:id` (move card)**
```json
Request:
{ "column_id": "uuid-of-in-review", "order": 2 }

Response 200:
{
  "data": {
    "id": "uuid",
    "title": "Design login screen",
    "column_id": "uuid-of-in-review",
    "order": 2,
    "updated_at": "2026-07-09T10:15:00Z"
  }
}
```

## 6. Comments

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/tasks/:id/comments` | List comments on a task | Viewer+ |
| POST | `/tasks/:id/comments` | Add comment (supports `@mentions` parsed server-side) | Member+ |
| PATCH | `/comments/:id` | Edit own comment | Member+ (own) |
| DELETE | `/comments/:id` | Delete comment | Member+ (own) or Admin |

## 7. Notifications

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/notifications` | List current user's notifications | Any authenticated |
| PATCH | `/notifications/:id/read` | Mark notification as read | Any authenticated |
| PATCH | `/notifications/read-all` | Mark all as read | Any authenticated |

## 8. Analytics

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| GET | `/projects/:id/analytics/status-breakdown` | Task counts by status | Viewer+ |
| GET | `/projects/:id/analytics/overdue` | List of overdue tasks | Viewer+ |
| GET | `/workspaces/:id/analytics/workload` | Per-member open task counts | Viewer+ |
| GET | `/projects/:id/analytics/completion-trend?range=30d` | Completed tasks over time | Viewer+ |

## 9. Real-Time Events (WebSocket)

Connection: `wss://api.taskflow.app/ws?token=<access_token>`
Clients subscribe to a project channel: `project:<projectId>`

| Event | Payload (example) | Triggered By |
|---|---|---|
| `task.created` | `{ task }` | POST task |
| `task.updated` | `{ task }` | PATCH task |
| `task.moved` | `{ taskId, columnId, order }` | PATCH task (move) |
| `task.deleted` | `{ taskId }` | DELETE task |
| `comment.created` | `{ comment }` | POST comment |
| `presence.updated` | `{ userId, taskId, status }` | Client focus/blur on task |

## 10. Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Authenticated but role lacks permission |
| 404 | `NOT_FOUND` | Resource does not exist or not visible to user |
| 409 | `CONFLICT` | e.g., duplicate invite, concurrent edit conflict |
| 429 | `RATE_LIMITED` | Too many requests (e.g., login attempts) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
