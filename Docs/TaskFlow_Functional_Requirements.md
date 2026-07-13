# TaskFlow — Functional Requirements

**Numbering:** `FR-<module>.<item>` for traceability to test cases and user stories.
**Priority key:** P0 = launch blocker, P1 = important, P2 = nice-to-have.

---

## FR-1: Authentication & Account Management

| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | The system shall allow a user to register using an email address and password. | P0 |
| FR-1.2 | The system shall send a verification email upon registration and require verification before full access is granted. | P0 |
| FR-1.3 | The system shall allow login via Google OAuth. | P0 |
| FR-1.4 | The system shall hash all passwords using a secure algorithm (bcrypt or argon2) before storage. | P0 |
| FR-1.5 | The system shall issue a JWT access token and refresh token upon successful login. | P0 |
| FR-1.6 | The system shall allow a user to reset a forgotten password via a time-limited email link. | P0 |
| FR-1.7 | The system shall rate-limit login attempts (e.g., lockout after 5 failed attempts within 10 minutes). | P0 |
| FR-1.8 | The system shall allow a user to log out, invalidating the current session token. | P0 |
| FR-1.9 | The system shall support optional two-factor authentication. | P2 |

## FR-2: Workspace & Project Management

| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | The system shall allow an authenticated user to create a new workspace, becoming its Owner. | P0 |
| FR-2.2 | The system shall allow a Workspace Owner/Admin to rename or delete the workspace. | P0 |
| FR-2.3 | The system shall allow a Workspace Owner/Admin to invite members via email. | P0 |
| FR-2.4 | The system shall allow invitation via a shareable link with optional expiry. | P1 |
| FR-2.5 | The system shall allow Admins to create, rename, archive, and delete projects within a workspace. | P0 |
| FR-2.6 | Each project shall store a name, description, status (active/archived), owner, and creation timestamp. | P0 |
| FR-2.7 | The system shall allow a user to belong to multiple workspaces. | P0 |

## FR-3: Kanban Board

| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Each project shall have exactly one board containing one or more columns. | P0 |
| FR-3.2 | The system shall provide default columns (To Do, In Progress, In Review, Done) on project creation. | P0 |
| FR-3.3 | The system shall allow Admins/Members to create, rename, reorder, and delete columns. | P0 |
| FR-3.4 | The system shall allow a user to move a task card between columns via drag-and-drop. | P0 |
| FR-3.5 | The system shall allow a user to reorder task cards within a column. | P0 |
| FR-3.6 | Task cards shall display title, assignee avatar(s), due date, priority, and labels. | P0 |
| FR-3.7 | The system shall allow filtering the board by assignee, label, or priority. | P1 |
| FR-3.8 | The system shall allow searching tasks by title/keyword within a project. | P1 |

## FR-4: Role-Based Access Control

| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | The system shall support three workspace-level roles: Owner/Admin, Member, and Viewer. | P0 |
| FR-4.2 | The system shall restrict workspace/project/member management actions to Admins only. | P0 |
| FR-4.3 | The system shall allow Members to create, edit, move, and comment on tasks, but not manage membership or delete the workspace. | P0 |
| FR-4.4 | The system shall restrict Viewers to read-only access on boards, tasks, and analytics. | P0 |
| FR-4.5 | The system shall enforce role permissions on the server for every mutating API request. | P0 |
| FR-4.6 | The system shall allow an Admin to change another member's role or remove them from the workspace. | P0 |

## FR-5: Task Management & Assignment

| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | The system shall allow creation of a task with title, description, due date, priority, and labels. | P0 |
| FR-5.2 | The system shall allow a task to be assigned to one or more workspace members. | P0 |
| FR-5.3 | The system shall support sub-tasks/checklist items within a task. | P1 |
| FR-5.4 | The system shall support file attachments on a task. | P1 |
| FR-5.5 | The system shall maintain an activity log per task recording who changed what field and when. | P1 |
| FR-5.6 | The system shall notify an assignee when they are assigned to a task. | P1 |
| FR-5.7 | The system shall notify an assignee when a task's due date is approaching (e.g., 24 hours prior). | P1 |

## FR-6: Comments & Collaboration

| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | The system shall allow users with Member+ permissions to add threaded comments to a task. | P1 |
| FR-6.2 | The system shall support @mentioning a workspace member within a comment. | P1 |
| FR-6.3 | The system shall notify a mentioned user in-app. | P1 |
| FR-6.4 | The system shall allow a user to edit or delete their own comments. | P1 |
| FR-6.5 | The system shall allow Admins to delete any comment (moderation). | P2 |
| FR-6.6 | Comments shall support basic markdown-style formatting. | P2 |

## FR-7: Real-Time Updates

| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | The system shall propagate board changes to all connected clients viewing the same project within 1 second. | P1 |
| FR-7.2 | The system shall display presence indicators showing who is viewing/editing a task. | P2 |
| FR-7.3 | The system shall resolve conflicting simultaneous edits without data loss. | P1 |
| FR-7.4 | The system shall fall back to periodic polling if a WebSocket connection cannot be established. | P1 |

## FR-8: Analytics Dashboard

| ID | Requirement | Priority |
|---|---|---|
| FR-8.1 | The system shall display, per project, task counts by status. | P1 |
| FR-8.2 | The system shall display the count and list of overdue tasks. | P1 |
| FR-8.3 | The system shall display, per member, current open-task count. | P1 |
| FR-8.4 | The system shall display a timeline/trend chart of tasks completed over a selected date range. | P1 |
| FR-8.5 | The system shall allow filtering analytics by project and date range. | P1 |
| FR-8.6 | The system shall support CSV/PDF export of analytics summaries. | P2 |
