# TaskFlow — Non-Functional Requirements

**Numbering:** `NFR-<category>.<item>`

---

## NFR-1: Performance

| ID | Requirement |
|---|---|
| NFR-1.1 | 95th-percentile API response time shall not exceed 500ms under normal load. |
| NFR-1.2 | Drag-and-drop task moves shall visually update within 300ms of user action (optimistic UI). |
| NFR-1.3 | Real-time updates shall propagate to other connected clients within 1 second under normal network conditions. |

## NFR-2: Scalability

| ID | Requirement |
|---|---|
| NFR-2.1 | The system shall support workspaces with up to 100 members and 50 projects without significant degradation. |
| NFR-2.2 | The system architecture shall allow horizontal scaling of the real-time (WebSocket) layer via a pub-sub mechanism (e.g., Redis). |
| NFR-2.3 | The database schema shall support pagination for boards/tasks to avoid unbounded query growth as data scales. |

## NFR-3: Security

| ID | Requirement |
|---|---|
| NFR-3.1 | The system shall enforce HTTPS (TLS 1.2+) for all communication. |
| NFR-3.2 | The system shall store passwords using a salted, secure hashing algorithm (bcrypt/argon2). |
| NFR-3.3 | The system shall validate and sanitize all user input to prevent injection attacks (SQL injection, XSS). |
| NFR-3.4 | The system shall enforce authorization checks server-side on every request affecting protected resources. |
| NFR-3.5 | The system shall address, at minimum, the OWASP Top 10 vulnerability categories. |
| NFR-3.6 | Session tokens shall have a defined expiry and support refresh without forcing re-authentication for active users. |
| NFR-3.7 | File attachment uploads shall be scanned/restricted by file type and size to prevent abuse. |

## NFR-4: Availability & Reliability

| ID | Requirement |
|---|---|
| NFR-4.1 | The system shall target 99.5% uptime, excluding scheduled maintenance. |
| NFR-4.2 | The system shall gracefully degrade real-time features (fallback to polling) rather than fail entirely if the WebSocket layer is unavailable. |
| NFR-4.3 | The system shall retry failed background jobs (e.g., notification delivery) with exponential backoff. |

## NFR-5: Usability & Accessibility

| ID | Requirement |
|---|---|
| NFR-5.1 | Core flows (signup, create project, create task, move task) shall be completable without a manual by a first-time user. |
| NFR-5.2 | The UI shall conform to WCAG 2.1 Level AA for core user flows. |
| NFR-5.3 | The UI shall be fully operable via keyboard alone for core flows. |
| NFR-5.4 | The UI shall be responsive and usable at widths down to 375px. |

## NFR-6: Maintainability

| ID | Requirement |
|---|---|
| NFR-6.1 | The codebase shall follow a documented style guide and be organized by domain (auth, workspace, task, etc.). |
| NFR-6.2 | The system shall include automated test coverage for all P0 functional requirements. |
| NFR-6.3 | API endpoints shall be versioned to allow non-breaking evolution. |

## NFR-7: Data Requirements

| ID | Requirement |
|---|---|
| NFR-7.1 | User data shall be exportable and deletable upon user request (GDPR-style data portability/erasure). |
| NFR-7.2 | Task and comment data shall be retained indefinitely unless explicitly deleted by an authorized user. |
| NFR-7.3 | Database backups shall be performed on a regular schedule (e.g., daily) with a defined retention period. |

## NFR-8: Compatibility

| ID | Requirement |
|---|---|
| NFR-8.1 | The system shall support the latest 2 versions of Chrome, Firefox, Safari, and Edge. |
| NFR-8.2 | The system shall not require any browser plugin or extension to function. |
