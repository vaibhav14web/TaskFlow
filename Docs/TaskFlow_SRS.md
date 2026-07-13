# Software Requirements Specification (SRS)
## TaskFlow — Collaborative Project Management Platform

**Version:** 1.0
**Date:** July 9, 2026
**Status:** Draft
**Prepared for:** TaskFlow Development Team

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional and non-functional requirements for **TaskFlow**, a web-based collaborative project management platform. It is intended for use by the development team, QA, and project stakeholders as the authoritative reference for what the system must do prior to and during implementation.

### 1.2 Scope
TaskFlow allows individuals and small teams to:
- Register and authenticate securely
- Create and manage workspaces and projects
- Organize work using a Kanban board
- Assign tasks with due dates, priorities, and labels
- Collaborate via comments and mentions
- Receive real-time updates as teammates work
- View analytics on project and team progress

The system is delivered as a responsive web application in v1. Native mobile apps, billing/invoicing, Gantt charts, and third-party integrations (e.g., Slack, GitHub) are explicitly **out of scope** for this version (see §1.6).

### 1.3 Intended Audience
| Audience | Use of this document |
|---|---|
| Developers | Implementation reference |
| QA/Test engineers | Basis for test case design |
| Product/Project managers | Scope and acceptance tracking |
| UX/UI designers | Constraint and flow reference |

### 1.4 Definitions, Acronyms, and Abbreviations
| Term | Definition |
|---|---|
| **Workspace** | Top-level container owned by a user, holding one or more projects and a member list |
| **Project** | A body of work within a workspace, containing a single Kanban board |
| **Board** | The Kanban view of a project, made up of columns and task cards |
| **Task** | A unit of work represented as a card on the board |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token |
| **SRS** | Software Requirements Specification |
| **P0/P1/P2** | Priority levels (P0 = launch blocker, P1 = important, P2 = nice-to-have) |

### 1.5 References
- TaskFlow Vision Document (internal)
- TaskFlow Product Requirements Document (PRD), v1.0
- OWASP Top 10 (2021/2024 revisions)
- WCAG 2.1 Level AA Guidelines

### 1.6 Out of Scope (v1)
- Native iOS/Android applications
- Time tracking, billing, and invoicing
- Gantt chart and resource-leveling views
- Third-party integrations (Slack, GitHub, Google Calendar, etc.)
- Offline-first / offline editing support
- Multi-language (i18n) support

---

## 2. Overall Description

### 2.1 Product Perspective
TaskFlow is a new, standalone system (not an extension of an existing product). It is a multi-tenant SaaS-style web application where each workspace represents an isolated tenant boundary for data access purposes.

### 2.2 Product Functions (Summary)
1. User registration, login, and session management
2. Workspace and project creation/management
3. Kanban board with drag-and-drop task management
4. Role-based permissions (Admin, Member, Viewer)
5. Task assignment, due dates, priorities, labels
6. Threaded comments with @mentions
7. Real-time collaborative updates (WebSocket-based)
8. Analytics dashboard (completion rates, workload, timelines)

### 2.3 User Classes and Characteristics
| User Class | Technical Proficiency | Typical Use |
|---|---|---|
| **Admin/Owner** | Low–Medium | Sets up workspace, invites members, manages roles, oversees analytics |
| **Member** | Low–Medium | Creates/updates tasks, comments, moves cards |
| **Viewer** | Low | Reads board and analytics, no edit rights |

### 2.4 Operating Environment
- **Client:** Modern web browsers (latest 2 versions of Chrome, Firefox, Safari, Edge), responsive down to 375px width
- **Server:** Cloud-hosted backend (Node.js runtime assumed), containerized deployment
- **Database:** PostgreSQL (primary datastore), Redis (caching / WebSocket pub-sub)
- **Storage:** S3-compatible object storage for attachments and avatars

### 2.5 Design and Implementation Constraints
- Must use HTTPS for all client-server communication
- Passwords must never be stored or logged in plaintext
- Server-side enforcement of RBAC is mandatory (client-side checks are not sufficient)
- Must support at least 100 members per workspace and 50 projects per workspace without significant performance degradation
- Real-time features depend on persistent WebSocket connections; system must degrade gracefully (fallback to polling) if WebSocket connection fails

### 2.6 Assumptions and Dependencies
- Users have a valid email address for account verification
- Users have a stable internet connection for real-time features to function as intended
- Third-party OAuth providers (e.g., Google) remain available and API-stable
- A managed WebSocket/Redis pub-sub layer is available for scaling real-time sync beyond a single server instance

---

## 3. System Features (Functional Requirements)

Each feature includes a description, priority, and testable requirement statements (numbered `FR-x.y` for traceability).

### 3.1 Authentication & Account Management (Priority: P0)
**Description:** Users must be able to securely create an account, log in, and manage their session.

| ID | Requirement |
|---|---|
| FR-1.1 | The system shall allow a user to register using an email address and password. |
| FR-1.2 | The system shall send a verification email upon registration and require verification before full access is granted. |
| FR-1.3 | The system shall allow login via Google OAuth. |
| FR-1.4 | The system shall hash all passwords using a secure algorithm (bcrypt or argon2) before storage. |
| FR-1.5 | The system shall issue a JWT access token and refresh token upon successful login. |
| FR-1.6 | The system shall allow a user to reset a forgotten password via a time-limited email link. |
| FR-1.7 | The system shall rate-limit login attempts to mitigate brute-force attacks (e.g., lockout after 5 failed attempts within 10 minutes). |
| FR-1.8 | The system shall allow a user to log out, invalidating the current session token. |

### 3.2 Workspace & Project Management (Priority: P0)
| ID | Requirement |
|---|---|
| FR-2.1 | The system shall allow an authenticated user to create a new workspace, becoming its Owner. |
| FR-2.2 | The system shall allow a Workspace Owner/Admin to rename or delete the workspace. |
| FR-2.3 | The system shall allow a Workspace Owner/Admin to invite members via email or a shareable invite link. |
| FR-2.4 | The system shall allow Admins to create, rename, archive, and delete projects within a workspace. |
| FR-2.5 | Each project shall store a name, description, status (active/archived), owner, and creation timestamp. |
| FR-2.6 | The system shall allow a user to belong to multiple workspaces. |

### 3.3 Kanban Board (Priority: P0)
| ID | Requirement |
|---|---|
| FR-3.1 | Each project shall have exactly one board containing one or more columns. |
| FR-3.2 | The system shall provide default columns (`To Do`, `In Progress`, `In Review`, `Done`) upon project creation. |
| FR-3.3 | The system shall allow Admins/Members to create, rename, reorder, and delete columns. |
| FR-3.4 | The system shall allow a user to move a task card between columns via drag-and-drop. |
| FR-3.5 | The system shall allow a user to reorder task cards within a column. |
| FR-3.6 | Task cards shall visually display title, assignee avatar(s), due date, priority, and labels. |
| FR-3.7 | The system shall allow filtering the board by assignee, label, or priority. |
| FR-3.8 | The system shall allow searching tasks by title/keyword within a project. |

### 3.4 Role-Based Access Control (Priority: P0)
| ID | Requirement |
|---|---|
| FR-4.1 | The system shall support three workspace-level roles: Owner/Admin, Member, and Viewer. |
| FR-4.2 | The system shall restrict workspace/project/member management actions to Admins only. |
| FR-4.3 | The system shall allow Members to create, edit, move, and comment on tasks, but not manage workspace membership or delete the workspace. |
| FR-4.4 | The system shall restrict Viewers to read-only access on boards, tasks, and analytics. |
| FR-4.5 | The system shall enforce role permissions on the server for every mutating API request, independent of client-side UI restrictions. |
| FR-4.6 | The system shall allow an Admin to change another member's role or remove them from the workspace. |

### 3.5 Task Management & Assignment (Priority: P0)
| ID | Requirement |
|---|---|
| FR-5.1 | The system shall allow a user with sufficient permissions to create a task with a title, description, due date, priority, and labels. |
| FR-5.2 | The system shall allow a task to be assigned to one or more workspace members. |
| FR-5.3 | The system shall support sub-tasks/checklist items within a task. |
| FR-5.4 | The system shall support file attachments on a task. |
| FR-5.5 | The system shall maintain an activity log per task recording who changed what field and when. |
| FR-5.6 | The system shall notify an assignee when they are assigned to a task. |
| FR-5.7 | The system shall notify an assignee when a task's due date is approaching (e.g., 24 hours prior). |

### 3.6 Comments & Collaboration (Priority: P1)
| ID | Requirement |
|---|---|
| FR-6.1 | The system shall allow users with Member+ permissions to add threaded comments to a task. |
| FR-6.2 | The system shall support @mentioning a workspace member within a comment. |
| FR-6.3 | The system shall notify a mentioned user in-app (and optionally via email). |
| FR-6.4 | The system shall allow a user to edit or delete their own comments. |
| FR-6.5 | The system shall allow Admins to delete any comment (moderation). |
| FR-6.6 | Comments shall support basic markdown-style formatting (bold, italic, links, code). |

### 3.7 Real-Time Updates (Priority: P1)
| ID | Requirement |
|---|---|
| FR-7.1 | The system shall propagate board changes (task moves, edits, creations, deletions) to all connected clients viewing the same project within 1 second. |
| FR-7.2 | The system shall display presence indicators showing which members are currently viewing or editing a task. |
| FR-7.3 | The system shall resolve conflicting simultaneous edits (e.g., two users moving the same card) using a last-write-wins or order-based strategy, without data loss of the task itself. |
| FR-7.4 | The system shall fall back to periodic polling if a WebSocket connection cannot be established or is dropped. |

### 3.8 Analytics Dashboard (Priority: P1)
| ID | Requirement |
|---|---|
| FR-8.1 | The system shall display, per project, the count of tasks by status (To Do/In Progress/In Review/Done). |
| FR-8.2 | The system shall display the number and list of overdue tasks. |
| FR-8.3 | The system shall display, per member, their current open-task count (workload). |
| FR-8.4 | The system shall display a timeline/trend chart of tasks completed over a selected date range. |
| FR-8.5 | The system shall allow filtering analytics by project and by date range. |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Responsive web UI, minimum supported width 375px (mobile web) up to standard desktop resolutions
- Consistent design system (typography, spacing, color) across all views
- Accessible per WCAG 2.1 AA: keyboard navigation, sufficient color contrast, ARIA labeling on interactive elements

### 4.2 Hardware Interfaces
Not applicable (standard web client hardware: browser, network connection).

### 4.3 Software Interfaces
| Interface | Purpose |
|---|---|
| Google OAuth API | Third-party login |
| Email delivery service (e.g., SES/SendGrid) | Verification, password reset, notification emails |
| S3-compatible object storage API | Attachment and avatar storage |
| WebSocket/Redis pub-sub layer | Real-time event broadcasting |

### 4.4 Communications Interfaces
- All client-server communication over HTTPS (TLS 1.2+)
- REST (or GraphQL) API for standard CRUD operations
- WebSocket protocol for real-time event streams

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
| ID | Requirement |
|---|---|
| NFR-1.1 | 95th-percentile API response time shall not exceed 500ms under normal load. |
| NFR-1.2 | Drag-and-drop task moves shall visually update within 300ms of user action (optimistic UI). |
| NFR-1.3 | Real-time updates shall propagate to other connected clients within 1 second under normal network conditions. |

### 5.2 Scalability Requirements
| ID | Requirement |
|---|---|
| NFR-2.1 | The system shall support workspaces with up to 100 members and 50 projects without significant degradation. |
| NFR-2.2 | The system architecture shall allow horizontal scaling of the real-time (WebSocket) layer via a pub-sub mechanism (e.g., Redis). |

### 5.3 Security Requirements
| ID | Requirement |
|---|---|
| NFR-3.1 | The system shall enforce HTTPS for all communication. |
| NFR-3.2 | The system shall store passwords using a salted, secure hashing algorithm. |
| NFR-3.3 | The system shall validate and sanitize all user input to prevent injection attacks (SQL injection, XSS). |
| NFR-3.4 | The system shall enforce authorization checks server-side on every request affecting protected resources. |
| NFR-3.5 | The system shall address, at minimum, the OWASP Top 10 vulnerability categories. |
| NFR-3.6 | Session tokens shall have a defined expiry and support refresh without requiring re-authentication for active users. |

### 5.4 Availability & Reliability Requirements
| ID | Requirement |
|---|---|
| NFR-4.1 | The system shall target 99.5% uptime, excluding scheduled maintenance. |
| NFR-4.2 | The system shall gracefully degrade real-time features (fallback to polling) rather than fail entirely if the WebSocket layer is unavailable. |

### 5.5 Usability & Accessibility Requirements
| ID | Requirement |
|---|---|
| NFR-5.1 | Core flows (signup, create project, create task, move task) shall be completable without a manual/tutorial by a first-time user. |
| NFR-5.2 | The UI shall conform to WCAG 2.1 Level AA for core user flows. |
| NFR-5.3 | The UI shall be fully operable via keyboard alone for core flows. |

### 5.6 Maintainability Requirements
| ID | Requirement |
|---|---|
| NFR-6.1 | The codebase shall follow a documented style guide and be organized by domain (auth, workspace, task, etc.) to support independent development. |
| NFR-6.2 | The system shall include automated test coverage for all P0 functional requirements. |

### 5.7 Data Requirements
| ID | Requirement |
|---|---|
| NFR-7.1 | User data shall be exportable and deletable upon user request (GDPR-style data portability/erasure). |
| NFR-7.2 | Task and comment data shall be retained indefinitely unless explicitly deleted by an authorized user. |
| NFR-7.3 | Database backups shall be performed on a regular schedule (e.g., daily) with a defined retention period. |

---

## 6. Data Model Overview

| Entity | Key Attributes |
|---|---|
| **User** | id, name, email, password_hash, avatar_url, created_at |
| **Workspace** | id, name, owner_id, created_at |
| **WorkspaceMember** | workspace_id, user_id, role |
| **Project** | id, workspace_id, name, description, status, created_at |
| **Board** | id, project_id |
| **Column** | id, board_id, name, order |
| **Task** | id, column_id, title, description, priority, due_date, order, created_at |
| **TaskAssignee** | task_id, user_id |
| **Comment** | id, task_id, user_id, body, created_at |
| **Notification** | id, user_id, type, payload, read_at, created_at |
| **ActivityLog** | id, task_id, user_id, action, created_at |

*(Full entity-relationship diagram and field-level schema to be developed separately in the technical design phase.)*

---

## 7. Acceptance Criteria Summary

The system will be considered ready for v1 release when:
- All **P0** functional requirements (§3.1–3.5) are implemented and pass QA test cases
- All **P1** functional requirements (§3.6–3.8) are implemented or explicitly deferred with stakeholder sign-off
- All Security (§5.3) and Availability (§5.4) non-functional requirements are verified
- WCAG 2.1 AA accessibility audit is passed for core flows
- No open Critical or High severity defects remain

---

## 8. Appendix

### 8.1 Requirement Priority Key
- **P0** — Must have for launch (blocking)
- **P1** — Should have for launch (strongly desired, may slip one release if needed)
- **P2** — Could have (nice-to-have, backlog candidate)

### 8.2 Revision History
| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-09 | Initial SRS drafted from TaskFlow Vision and PRD |

### 8.3 Open Items for Stakeholder Review
- Confirm whether email notifications (in addition to in-app) are required for v1 (currently P1/Should).
- Confirm target concurrent-user scale to finalize WebSocket infrastructure sizing.
- Confirm data retention/export policy requirements (regulatory scope, e.g., GDPR applicability).
