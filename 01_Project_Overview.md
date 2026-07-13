# Interview Preparation Roadmap

1. **Module 01**: Project Overview
2. **Module 02**: Architecture & Design Patterns
3. **Module 03**: Database & Schema Design
4. **Module 04**: Authentication & Security (OAuth & 2FA/TOTP)
5. **Module 05**: Backend APIs & Controllers
6. **Module 06**: Frontend & State Management (React Query & Dnd-kit)
7. **Module 07**: Business Logic & Task Board Extensions (Swimlanes & Timelines)
8. **Module 08**: Deployment, Docker & CI/CD
9. **Module 09**: Performance Optimizations & Caching
10. **Module 10**: Testing Frameworks (Prisma Mocks & Supertest)
11. **Module 11**: Security Constraints (Rate Limiting & RBAC)
12. **Module 12**: Resume Discussion & Leadership Scenarios

---

# Module 01: Project Overview

---

## 1. Purpose

### Why This Module Exists
The **Project Overview** module establishes the mental model for TaskFlow. In an interview, the first 5 minutes dictate the tone of the entire session. If a candidate cannot articulate the "why," the "what," and the "how" of their project holistically, deep technical discussions on database locks or token cryptography lose context. This module aligns the product requirements with the technical decisions made throughout the system.

### What Problem It Solves
TaskFlow solves the problem of unstructured, siloed, and static collaboration within engineering and product teams. Traditional project management software is either:
1. Overly complex and sluggish (e.g., enterprise Jira setups with bloated custom workflows).
2. Lightweight but lacking security, audit trails, and financial/time correlation (e.g., basic Trello).

TaskFlow provides a secure, high-performance, real-time workspace with built-in audit logging, granular multi-tenant access control (RBAC), multi-dimensional task grouping (swimlanes), schedule visualization (Gantt/Timeline), and integrated time-billing execution.

### How It Interacts With Other Modules
This overview acts as the umbrella orchestrator. It outlines how:
* The **Frontend (React)** communicates state transitions via React Query to the **Backend (Express)**.
* State alterations trigger events broadcasted by **Socket.io** to peers.
* Operations are gated by **RBAC rules** and mapped cleanly through **Prisma** to the relational database.

```
+--------------------------------------------------------+
|                      TaskFlow App                      |
+--------------------------------------------------------+
                           |
       +-------------------+-------------------+
       |                   |                   |
+------------+      +------------+      +------------+
| Auth/2FA   |      | Workspaces |      | Task Board |
+------------+      +------------+      +------------+
       |                   |                   |
       +-------------------+-------------------+
                           |
                     +-----------+
                     | Database  |
                     +-----------+
```

### Real-World Analogy
Think of TaskFlow as a highly secure, digital airport terminal. 
* The **Workspace** represents the airport terminal itself (restricting entry to ticket holders / whitelisted domains).
* The **Board & Columns** represent the security queues, baggage drops, and boarding gates where passengers (Tasks) move sequentially.
* The **Audit Log** acts as the flight controller black box, recording every single transition.
* **Stopwatch / Time logs** represent the flight times logged by pilots, which are aggregated at the end of the month into fuel and crew billing invoices.

---

## 2. High-Level Overview

TaskFlow is built on a decoupled, client-server architecture designed to scale independently:

```
+-------------------------+               +--------------------------------------+
|     React Frontend      | <--- HTTP --->|            Express Backend           |
|  (Vite, TS, React Query)|               |         (Node.js, TypeScript)        |
+-------------------------+               +--------------------------------------+
  |                     ^                   |                  |             |
  | Socket.io           | Socket.io         | Prisma Client    | fetch()     | SMTP / SES
  v                     |                   v                  v             v
+-------------------------+               +------------------+ +-----------+ +-------------+
|    Socket.io Gateway    |<------------->| PostgreSQL DB    | | Google API| | Mail Server |
|      (Real-time)        |               | (schema.prisma)  | |  (OAuth)  | |  (Invites)  |
+-------------------------+               +------------------+ +-----------+ +-------------+
```

---

## 3. Detailed Workflow

To understand the lifecycle of data in TaskFlow, let us trace a typical collaborative operation: **An administrator updates a task column and assigns a team member.**

### Data Flow Sequence
1. **Input Phase**:
   * The client initiates a drag-and-drop gesture on the UI.
   * `DndContext` captures the drag coordinates, mapping the card's original column ID to the target column ID.
   * The frontend updates local state optimistically to guarantee <60ms UI responsiveness.
2. **Processing Phase**:
   * An HTTP `PATCH /api/v1/tasks/:id` request is dispatched with `{ columnId: "target-col-uuid", order: 2 }`.
   * The backend routing layer intercepts the request.
   * The **Auth Middleware** verifies the JWT in the `Authorization` header, populating `req.userId`.
   * The **RBAC Engine** queries the database to confirm the user is a `MEMBER`, `ADMIN`, or `OWNER` of the parent workspace.
   * A Prisma database transaction (`$transaction`) updates the task's column location and shifts the ordering indices of adjacent tasks in the destination column to prevent collision.
   * An **Activity Log** entry is appended to track the mutation: `User A moved Task X to Column Y`.
3. **Output & Broadcast Phase**:
   * The database returns the mutated task object.
   * The controller responds to the client with `200 OK` containing the updated payload.
   * Simultaneously, the server fires a Socket.io event `task:moved` to the project room.
   * Peer clients listening to the room capture the socket payload and invalidate their local React Query cache, triggering a silent background re-fetch to sync their screens.
4. **Error & Edge Cases**:
   * **Database Down**: The Prisma transaction fails. The backend catches the exception, rolls back, and returns `500 Internal Server Error`. The client's optimistic UI rolls back to the original position, displaying a toast notification.
   * **Concurrent Drag**: Two users move the same task simultaneously. The first request database lock wins. The second request encounters a version conflict or column validation mismatch and returns `400 Bad Request` or `404`, forcing a frontend state refresh.

---

## 4. Classes

Since TaskFlow uses a modular, functional approach on the backend and custom hooks on the frontend, object-oriented "Classes" are primarily represented by **Type Models** and **Prisma Client Delegations**. Below is the representation of our service patterns:

### `PrismaClient` (Service Engine)
* **Purpose**: Object-Relational Mapping (ORM) proxy class.
* **Responsibilities**: Executes database queries, handles connection pools, runs transactions, and translates database errors into TypeScript exceptions.
* **Relationships**: Instantiated once globally as a singleton inside [prisma.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/utils/prisma.ts) and imported by all controller services.
* **Key Fields**:
  * `user`: Database delegate for the `users` table.
  * `workspace`: Database delegate for `workspaces`.
  * `task`: Database delegate for `tasks`.
  * `timeLog`: Database delegate for `time_logs`.
* **Why This Design**: Using a single client instance prevents connection leaks (exhausting PostgreSQL connection limits) and ensures transaction queries are routed via the same pool.

---

## 5. Functions

### `verifyWorkspaceRole(userId, workspaceId, allowedRoles)`
* **Purpose**: Centralized Role-Based Access Control (RBAC) checker.
* **Parameters**:
  * `userId`: `string` - The authenticated user ID.
  * `workspaceId`: `string` - The workspace target.
  * `allowedRoles`: `Role[]` - Array of acceptable enum values (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
* **Return Value**: `Promise<void>` (throws a `Forbidden` error if validation fails).
* **Time Complexity**: $O(1)$ (direct primary key lookup on `workspace_members`).
* **Space Complexity**: $O(1)$.
* **Execution Block**:
  ```typescript
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } }
  });
  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
  ```
* **Why Written This Way**: This function centralizes security authorization. Placing it in the controllers (rather than writing inline DB checks) enforces DRY principles and makes security auditing simple.
* **Alternative Implementation**: Implementing RBAC as an Express middleware interceptor.
  * *Pros*: Completely separates authorization logic from controller business logic.
  * *Cons*: Requires parsing the `workspaceId` from different request contexts (`params`, `query`, or `body`) before hitting the routing endpoint, making it less flexible than inline controller checks when fetching compound aggregates (e.g., retrieving a project where workspace context is nested).

---

## 6. Architecture Discussion

### SOLID Principles in TaskFlow
* **Single Responsibility Principle (SRP)**: Controllers handle request-response formatting, routing files manage endpoints, and services/Prisma interact with the persistence layer. For example, [time-log.controller.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/controllers/time-log.controller.ts) only coordinates time tracking logs and project billing calculations.
* **Open/Closed Principle (OCP)**: Endpoints use a base API versioning prefix (`/api/v1`). If we introduce a v2 with different payload requirements, we can write new controllers without breaking existing client integrations.
* **Liskov Substitution Principle (LSP)**: Prisma client models conform to typed structures. For instance, any query returning a `Task` must satisfy the core properties defined in the Prisma client typescript interface.
* **Interface Segregation**: Frontend API helper modules (e.g., `timeLogApi`, `boardApi` inside `api.ts`) expose small, specialized function surfaces instead of a single bloated monolith client.
* **Dependency Inversion**: Rather than hardcoding database instances, helpers import the singleton DB client from a utility file, making it easy to swap with mock engines during test execution.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is the role of Prisma in this application?
* **Answer**: Prisma acts as the Object-Relational Mapper (ORM). It generates a type-safe client based on our `schema.prisma` file, enabling autocomplete, validation, and auto-generated database migrations for PostgreSQL.
* **Explanation**: Instead of writing raw SQL queries, Prisma allows us to query the database using type-safe TypeScript methods (e.g., `prisma.task.findMany()`).
* **Follow-up**: *How does Prisma handle migrations?* It compares the active database state with the Prisma schema and generates SQL files via `prisma migrate dev`.
* **Common Mistakes**: Claiming that Prisma runs inside the browser (it is strictly a server-side ORM).

#### 2. What is optimistic UI, and how does the frontend use it?
* **Answer**: Optimistic UI updates the user interface immediately assuming the server request will succeed, reverting the state if it actually fails.
* **Explanation**: When dragging a task to another column, the UI moves the card instantly. If the backend patch fails, the card snaps back.
* **Follow-up**: *What libraries are used here for this?* React Query manages cache updates, while Framer Motion handles visual card animation.
* **Common Mistakes**: Saying that optimistic UI writes data to the database directly.

#### 3. Why are JWTs used instead of session cookies in TaskFlow?
* **Answer**: JWTs enable stateless authentication, making it easier to scale horizontally without maintaining a session store.
* **Explanation**: The server verifies the JWT signature on every incoming request without needing to query a database or Redis cache to check session validity.
* **Follow-up**: *How does the server verify a JWT?* It decrypts and verifies the header and payload signature using a server-side `JWT_SECRET`.
* **Common Mistakes**: Storing sensitive user data (like passwords) inside the unencrypted base64-encoded JWT payload.

#### 4. How does the frontend handle real-time synchronization?
* **Answer**: It uses Socket.io to establish a persistent WebSocket connection between the client and server.
* **Explanation**: When a project update happens, the server broadcasts an event to the Socket.io channel, prompting listening clients to invalidate their cache.
* **Follow-up**: *What happens if the websocket connection drops?* Socket.io automatically attempts reconnection and triggers fallback polling if configured.
* **Common Mistakes**: Thinking WebSocket is a standard HTTP request/response protocol.

#### 5. What are Prisma's cascade deletes, and where are they used in this codebase?
* **Answer**: Cascade deletes ensure that when a parent record is deleted, all dependent child records are deleted automatically by the database.
* **Explanation**: In `schema.prisma`, `onDelete: Cascade` is applied to columns, tasks, and time logs. Deleting a project automatically deletes its board, columns, tasks, comments, and time logs.
* **Follow-up**: *What happens if cascade delete is missing?* The delete query fails with a foreign key constraint violation error.
* **Common Mistakes**: Forgetting to delete data in the correct sequence during test teardowns, causing database lockups.

#### 6. What is the difference between a Task and a Column in the database schema?
* **Answer**: A Column represents a list status (e.g., "To Do"), while a Task represents a specific item. They share a one-to-many relationship.
* **Explanation**: A Column has many Tasks, but a Task belongs to exactly one Column via a foreign key `columnId`.
* **Follow-up**: *How is their relative order maintained?* Both models have an `order` integer field to sort records sequentially.
* **Common Mistakes**: Storing tasks as an array inside the Column table instead of using foreign key relations.

#### 7. How does the app restrict workspace access to specific email domains?
* **Answer**: The Workspace model has a nullable `allowedDomains` string field containing comma-separated domains (e.g., `"company.com,tech.org"`).
* **Explanation**: During invite-joining or registration checks, the backend validates if the registering user's email domain matches the whitelist.
* **Follow-up**: *Where is this checked?* In the workspace member verification and invite controller endpoints.
* **Common Mistakes**: Doing domain validation on the frontend only, which can be bypassed.

#### 8. What is CORS and why is it configured in the backend?
* **Answer**: Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts resources from being loaded from another domain.
* **Explanation**: The backend configures CORS to allow HTTP requests only from the frontend's specific origin (e.g., `http://localhost:5173`).
* **Follow-up**: *What happens if CORS is not configured?* The browser blocks the frontend's API calls.
* **Common Mistakes**: Setting `origin: '*'` in production CORS configurations.

#### 9. What is Role-Based Access Control (RBAC)?
* **Answer**: RBAC is a security authorization model that assigns permissions to users based on their assigned role in the system.
* **Explanation**: In TaskFlow, the roles are `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`.
* **Follow-up**: *Can a Viewer delete a column?* No, the backend blocks updates from users without the Admin or Owner role.
* **Common Mistakes**: Conflating authentication (who you are) with authorization (what permissions you have).

#### 10. Why is TypeScript used instead of pure JavaScript in this project?
* **Answer**: TypeScript introduces static typing, catching bugs during development before runtime.
* **Explanation**: Features like Prisma auto-generated types ensure we don't query columns that don't exist or pass invalid arguments.
* **Follow-up**: *How is it run in production?* It is compiled into plain JavaScript via `tsc` and run with Node.
* **Common Mistakes**: Stating that TypeScript runs natively in the browser or Node.js runtime.

#### 11. What is rate limiting, and why is it implemented?
* **Answer**: Rate limiting limits the number of requests a client can make in a given timeframe to prevent abuse and denial-of-service (DoS) attacks.
* **Explanation**: The app uses rate limiters on security-sensitive routes like authentication, OAuth, and login.
* **Follow-up**: *What is the HTTP response code for rate limits?* `429 Too Many Requests`.
* **Common Mistakes**: Setting identical rate limits for public static assets and authentication endpoints.

#### 12. How does the application store user passwords securely?
* **Answer**: Passwords are encrypted using a cryptographic hashing algorithm (bcrypt) before storage.
* **Explanation**: Only the resulting hash is stored in the database. During login, the password attempt is hashed and compared to the stored value.
* **Follow-up**: *Can we retrieve a lost password?* No, hashes are one-way. We must reset it.
* **Common Mistakes**: Stating that bcrypt "encrypts" passwords instead of "hashing" them.

#### 13. What is a Prisma Client singleton, and why do we use it?
* **Answer**: It is a design pattern that ensures only one instance of the Prisma Client exists in the runtime memory.
* **Explanation**: Re-instantiating `PrismaClient` on every import creates new database connection pools, quickly exhausting connection limits.
* **Follow-up**: *Where is this defined?* In `src/utils/prisma.ts`.
* **Common Mistakes**: Instantiating `new PrismaClient()` in every controller.

#### 14. What are Jest mock functions, and why are they used?
* **Answer**: Mocks simulate the behavior of real modules or functions to isolate the unit of code under test.
* **Explanation**: We mock external dependencies (like sending emails or Google's token verification URL) to keep tests fast and deterministic.
* **Follow-up**: *How do you clear mocks?* Using `jest.clearAllMocks()`.
* **Common Mistakes**: Mocking database outputs in integration tests where full database state verification is required.

#### 15. What does `npx prisma generate` do?
* **Answer**: It reads the `schema.prisma` file and regenerates the Prisma Client TypeScript typings.
* **Explanation**: Whenever database schemas change, running this command ensures our code editor and compiler recognize the new fields.
* **Follow-up**: *What happens if you modify the schema but skip this step?* The TypeScript compiler throws errors because the typings in `node_modules` are stale.
* **Common Mistakes**: Thinking it modifies database tables.

---

### Medium (20)

#### 1. Why does the backend use Express middleware to parse JWT tokens?
* **Interviewer's Intent**: To check the candidate's understanding of modular design and the request-response lifecycle in Express.
* **Answer**: We use custom middleware to extract the JWT from the `Authorization` header (`Bearer <token>`), verify its signature using the secret key, and attach the decoded payload (`userId`) to the request object (`req.userId`).
* **Why Interviewer Asks**: This tests if you know how to build reusable authentication gates without duplicating verification checks in individual controllers.
* **Common Mistakes**: Extracting the JWT manually inside every controller instead of using route-level middleware.
* **Follow-up**: *What happens if the token is expired?* The middleware intercepts the request, blocks execution, and returns `401 Unauthorized` with a `TOKEN_EXPIRED` code.
* **Production Example**: In `auth.middleware.ts`, checking the token format, validating expiry, and returning standard JSON error responses.

#### 2. How do you design a database schema to prevent circular cascades?
* **Interviewer's Intent**: To evaluate database design competency and knowledge of relational constraints under cascade operations.
* **Answer**: Circular cascades happen when Entity A cascades to B, which cascades to C, which cascades back to A. To prevent this, we maintain a strict hierarchical relationship: Workspaces -> Projects -> Boards -> Columns -> Tasks -> TimeLogs. Deletion cascades only propagate downwards.
* **Why Interviewer Asks**: Poor cascade design can lead to database locking, partial deletions, or accidental system-wide data loss.
* **Common Mistakes**: Creating multiple foreign keys on a single table that point back to parent levels with redundant cascade rules.
* **Follow-up**: *How did you resolve this in test teardowns?* By executing deletions in reverse order (e.g., deleting `TimeLogs` and `Tasks` before `Columns` and `Boards`).
* **Production Example**: Designing PostgreSQL foreign key constraints with `ON DELETE CASCADE` specifically on parent relationships.

#### 3. How does React Query help handle offline sync or cache invalidation?
* **Interviewer's Intent**: To test state-management optimization and network resilience patterns on the frontend.
* **Answer**: React Query maintains a memory-cached version of the board data. When mutations occur (e.g., adding a task), we invalidate the cache key `['board', projectId]`. React Query then triggers a background fetch to reconcile the UI state with the database.
* **Why Interviewer Asks**: It shows the candidate understands how to keep client state synchronized with a database without resorting to constant polling or unnecessary re-renders.
* **Common Mistakes**: Manually reloading the entire webpage to sync changes.
* **Follow-up**: *How does React Query handle temporary network failures?* It retries failed queries with exponential backoff before displaying an error.
* **Production Example**: Utilizing `queryClient.invalidateQueries` inside mutation callbacks.

#### 4. How does the application prevent race conditions when two users drag cards in the same column?
* **Interviewer's Intent**: To test concurrency management and transactional safety in high-activity applications.
* **Answer**: We use Prisma database transactions (`$transaction`). When a task is moved, the order of adjacent tasks in the target column is re-calculated and written in a single transactional block, preventing intermediate modifications from corrupting the index order.
* **Why Interviewer Asks**: Concurrency bugs are difficult to reproduce. The interviewer wants to verify that your system is designed for multi-user safety.
* **Common Mistakes**: Updating task columns using individual, independent query commands instead of grouping them in a single transaction.
* **Follow-up**: *What isolation level does Prisma use by default?* Read Committed, which we rely on to avoid dirty reads.
* **Production Example**: Wrapping sequential index updates in a transaction array: `await prisma.$transaction([updateTask, ...reorderRemainingTasks])`.

#### 5. What are the security risks of storing a JWT token in localStorage?
* **Interviewer's Intent**: To test frontend security knowledge and mitigation of Cross-Site Scripting (XSS) attacks.
* **Answer**: Storing JWTs in `localStorage` makes them vulnerable to XSS attacks. If an attacker injects a malicious script, they can read the token using `localStorage.getItem('token')` and hijack the session.
* **Why Interviewer Asks**: Security is critical. Developers must understand where tokens are stored and the associated security trade-offs.
* **Common Mistakes**: Claiming `localStorage` is completely secure.
* **Follow-up**: *How would you mitigate this?* By storing tokens in memory and using httpOnly, secure, and SameSite cookies for token delivery, which prevents JavaScript access.
* **Production Example**: Implementing JWT exchange via secure cookies or using short-lived memory tokens with cookie-based refresh flows.

#### 6. How does Socket.io room management work in this project?
* **Interviewer's Intent**: To evaluate real-time architectural design and message isolation between projects.
* **Answer**: When a client loads a board, they emit a `join` event with the `projectId`. The server associates the client's socket ID with a Socket.io room named `project:${projectId}`. Subsequent updates inside that project are broadcasted only to users in that room.
* **Why Interviewer Asks**: Broadcasting project updates globally would create massive performance overhead and expose private workspace data to unauthorized clients.
* **Common Mistakes**: Sending socket messages globally to all connected connections.
* **Follow-up**: *What happens when a user navigates away from the project board?* They emit a `leave` event, and the server removes them from the room.
* **Production Example**: Handling rooms cleanly in Socket.io connection wrappers: `socket.join(`project:${projectId}`)`.

#### 7. How does the email verification flow protect user accounts?
* **Interviewer's Intent**: To check security design around registration verification.
* **Answer**: Upon registration, we generate a cryptographically secure token and store it on the user record. An email is dispatched with a link: `/verify?token=<token>`. Until this link is clicked and verified, the user's `emailVerified` status remains false, limiting their access to core platform features.
* **Why Interviewer Asks**: This prevents spam registrations, validation of actual ownership, and protects against malicious signups.
* **Common Mistakes**: Permitting full workspace creation before confirming email verification.
* **Follow-up**: *How do we ensure the token expires?* We add a `tokenExpiry` timestamp in the database and validate it during the verification request.
* **Production Example**: Creating verification tokens via Node's `crypto.randomBytes(32).toString('hex')`.

#### 8. What is optimistic locking versus pessimistic locking in Prisma?
* **Answer**: Optimistic locking assumes conflicts are rare, checking if a record has changed before writing. Pessimistic locking locks the database row until the transaction completes.
* **Why Interviewer Asks**: Demonstrates depth in database optimization and concurrency control.
* **Common Mistakes**: Recommending pessimistic locking for low-collision fields, which degrades database throughput.
* **Follow-up**: *Which one is suited for column reordering?* Optimistic locking, as users rarely update the same column sequence at the exact same millisecond.
* **Production Example**: Using version counters on rows or leveraging Prisma's transaction rollback behavior.

#### 9. Why do we need index optimization on foreign keys like workspaceId?
* **Answer**: Without index keys, every workspace query triggers a full-table scan in PostgreSQL. Indexing foreign keys reduces lookup complexity from $O(N)$ to $O(\log N)$.
* **Why Interviewer Asks**: To check database performance design skills on large datasets.
* **Common Mistakes**: Creating indexes on every single column without evaluating write overhead.
* **Follow-up**: *Does Prisma index foreign keys automatically?* PostgreSQL requires explicit indexing on foreign keys, which we configure via database mapping indexes.
* **Production Example**: Defining `@@index([workspaceId])` or `@@index([taskId])` inside `schema.prisma`.

#### 10. How does Node.js handle async/await under the hood?
* **Answer**: Async/await is syntactic sugar over Promises. Under the hood, Node's Event Loop schedules unresolved promises to run asynchronously, resuming execution once the call stack is clear.
* **Why Interviewer Asks**: Tests core Node.js runtime knowledge and Event Loop execution.
* **Common Mistakes**: Blocking the main thread with long-running synchronous loops inside async functions.
* **Follow-up**: *What handles the asynchronous tasks?* Libuv's thread pool or the operating system's asynchronous I/O interface.
* **Production Example**: Writing non-blocking file reads or database operations using standard `async/await` syntax.

#### 11. What is the difference between standard JWTs and refresh tokens?
* **Answer**: Access tokens are short-lived (e.g., 15 mins) and sent on every request. Refresh tokens are long-lived (e.g., 7 days), stored securely, and used to request new access tokens without requiring the user to re-authenticate.
* **Why Interviewer Asks**: Tests token lifecycle design and security engineering.
* **Common Mistakes**: Setting access token expiries to months, creating a massive security vulnerability if tokens are compromised.
* **Follow-up**: *How do you invalidate a refresh token?* By deleting it from a database blocklist or database token table.
* **Production Example**: Storing refresh tokens in HttpOnly cookies and validation on `/auth/refresh` endpoints.

#### 12. How does the app check for duplicate workspace memberships?
* **Answer**: In `schema.prisma`, we define a composite primary key on the `WorkspaceMember` model containing `[workspaceId, userId]`.
* **Why Interviewer Asks**: Demonstrates relational database constraint design.
* **Common Mistakes**: Writing database duplicate checks in code without enforcing unique constraints at the database level.
* **Follow-up**: *What error does Prisma throw on duplicate insert?* A unique constraint violation exception (`P2002`).
* **Production Example**: `@@id([workspaceId, userId])` in schema constraints.

#### 13. How does the rate limiter protect against brute-force attacks on login?
* **Answer**: It tracks request IPs or user emails. If a threshold (e.g., 5 attempts in 15 mins) is crossed, it blocks the IP and returns a `429 Too Many Requests` status, stopping resource-intensive cryptographic hash checks.
* **Why Interviewer Asks**: Password hashing (bcrypt) is CPU-heavy. Attackers can exploit this to launch Denial of Service (DoS) attacks on login routes.
* **Common Mistakes**: Placing rate-limiting middleware globally on all assets instead of targeting authentication endpoints.
* **Follow-up**: *How do we scale rate limiting across multiple backend instances?* By using a shared memory store like Redis instead of in-memory maps.
* **Production Example**: Implementing `express-rate-limit` with Redis storage backend.

#### 14. What are the benefits of using a layout wrapper in React Router?
* **Answer**: Layout wrappers isolate common components (like the Sidebar or Navbar) from individual pages, preventing duplicate component mounting and retaining UI state.
* **Why Interviewer Asks**: Checks frontend architectural style and rendering performance.
* **Common Mistakes**: Re-rendering navigation Sidebars on every route change.
* **Follow-up**: *Which component is used for nested routing outputs?* The `<Outlet />` component in React Router.
* **Production Example**: Wrapping dashboards with a shared layout wrapper containing `<Sidebar />` and the main `<Outlet />`.

#### 15. How do you mock external API calls (e.g. Google OAuth token verification) in tests?
* **Answer**: We use mock libraries or mock `fetch` requests globally during test execution to return static payloads.
* **Why Interviewer Asks**: Ensures tests are fast and don't make network calls to external APIs.
* **Common Mistakes**: Executing real network calls to production Google servers inside test suites.
* **Follow-up**: *What happens if the external API changes?* Integration tests should mock schemas that represent the expected response contract.
* **Production Example**: Using `jest.spyOn(global, 'fetch')` to return mock verification responses in `auth.test.ts`.

#### 16. What is N+1 query problem, and how does Prisma prevent it?
* **Answer**: N+1 queries occur when you load a list of parent records (N) and then query the database again for each parent's children. Prisma prevents this by fetching all related entities in a single SQL query using `JOIN` or `IN` statements.
* **Why Interviewer Asks**: It is a common database performance bottleneck in ORMs.
* **Common Mistakes**: Loop querying relational records instead of using Prisma's `include` parameters.
* **Follow-up**: *Does Prisma use JOINs for nested fetches?* Depending on the query, it either performs a JOIN or fetches relationships using secondary batch queries.
* **Production Example**: Loading all tasks with their assignees using `include: { assignees: true }`.

#### 17. How does the frontend handle file uploads securely?
* **Answer**: We validate file size constraints (e.g. max 5MB) and whitelist specific mime-types (e.g., images, PDFs) on both the client and server before writing to disk or cloud storage.
* **Why Interviewer Asks**: Uploading malicious files (like executable scripts) can compromise the server.
* **Common Mistakes**: Verifying file extensions only on the client.
* **Follow-up**: *How does the backend verify file types?* By checking the file's binary magic bytes instead of just the file extension.
* **Production Example**: Using `multer` with file filter verification logic.

#### 18. Why do we run database migrations in a transaction?
* **Answer**: Running migrations in a transaction ensures that if any part of the schema change fails, the entire migration rolls back, preventing the database from entering a corrupt or half-migrated state.
* **Why Interviewer Asks**: Checks database reliability and production deployment risk mitigation.
* **Common Mistakes**: Manually applying raw SQL changes on production databases without transactions.
* **Follow-up**: *Does PostgreSQL support DDL transactions?* Yes, PostgreSQL supports transactional DDL.
* **Production Example**: Prisma runs migrations inside transactional SQL blocks automatically.

#### 19. How do you handle deep nested relationships in Prisma updates?
* **Answer**: We use Prisma's nested write syntax (`connect`, `disconnect`, `create`, `update`) which wraps relational updates in a single SQL transaction.
* **Why Interviewer Asks**: Tests ORM syntax proficiency and database schema structure manipulation.
* **Common Mistakes**: Loading child items, updating them, and saving them back manually using separate database queries.
* **Follow-up**: *How do you add an assignee to a task?* Using the `connect` property within the task update method.
* **Production Example**: `prisma.task.update({ where: { id }, data: { assignees: { connect: { id: userId } } } })`.

#### 20. What are React custom hooks, and why did you create them?
* **Answer**: Custom hooks extract stateful logic from UI components, making it reusable across multiple screens.
* **Why Interviewer Asks**: To check frontend clean-code principles and modular design skills.
* **Common Mistakes**: Writing identical API calls and state configurations inside every component instead of refactoring them into custom hooks.
* **Follow-up**: *Can custom hooks share state?* No, each invocation of a hook gets its own isolated state.
* **Production Example**: Creating a `useTimeTracker` hook to encapsulate stopwatch state, manual logs, and mutations.

---

### Hard (20)

#### 1. How would you redesign the real-time Socket.io layer to scale horizontally across multiple node instances?
* **Detailed Answer**: Currently, Socket.io runs in memory. If we scale to 3 server instances behind a Load Balancer, a client connected to Server 1 cannot emit real-time events to a client connected to Server 2. To fix this, we must implement a **Redis Adapter** (`@socket.io/redis-adapter`). The server instances publish state changes to Redis, which acts as a pub/sub broker to broadcast events to all instances.
* **Deep Explanation**:
  ```
  Client A ---> Server 1 ---> Redis Pub/Sub (Broker) ---> Server 2 ---> Client B
  ```
  When User A moves a task on Server 1, the event is published to Redis. Server 2 receives it via the Redis subscription channel and emits it to User B.
* **Alternative Approach**: Using a managed WebSocket gateway (like AWS API Gateway WebSockets or Pusher).
  * *Pros*: Completely offloads socket connection state management, reducing server CPU/memory footprint.
  * *Cons*: Adds cost and external network hop latency.
* **Production Example**: In production deployments, configure sticky sessions on the load balancer (HAProxy/Nginx) so WebSocket handshake requests land on the same server, with Redis coordinating room sync.
* **Cross Questions**: *What happens if the Redis broker goes down?* Socket communication falls back to server-local events, meaning users on different instances won't receive real-time updates until Redis recovers. We mitigate this using a Redis cluster.

#### 2. How do you mitigate the risk of SQL injection in Prisma when using raw queries?
* **Detailed Answer**: Prisma's standard methods parameters are parameterized automatically. If we must write raw SQL using `prisma.$queryRaw`, we must use ES6 template literals that Prisma parses into parameterized inputs. We should never concatenate variables inside raw SQL strings.
* **Deep Explanation**: 
  * *Secure*: `prisma.$queryRaw`query`SELECT * FROM Task WHERE id = ${taskId}`` (TypeScript parameters are extracted into placeholders).
  * *Vulnerable*: `prisma.$queryRawUnsafe(`SELECT * FROM Task WHERE id = '${taskId}'`)` (The query string is evaluated directly, allowing malicious payloads to alter the query).
* **Alternative Approach**: Avoiding raw SQL entirely.
  * *Pros*: Guarantees type safety and database engine portability.
  * *Cons*: Limits advanced database features (like full-text search indexing or complex custom report aggregations).
* **Production Example**: Restricting the use of `$queryRawUnsafe` inside ESLint rules.
* **Cross Questions**: *Can SQL injection happen through Prisma search filters?* No, Prisma parameters are automatically escaped and bound to placeholders.

#### 3. How do you design a database indexing strategy for TaskFlow as task records scale to tens of millions?
* **Detailed Answer**: We must analyze query patterns. The most common operations are fetching tasks for a board/column and filtering by assignees or priority. 
  1. Add compound index on `Column(boardId, order)` to quickly fetch sorted lists.
  2. Add compound index on `Task(columnId, priority)` for filtered column lists.
  3. Ensure join tables (`_TaskAssignees`) have compound primary keys.
* **Deep Explanation**: Compound indexes must respect order. A query filtering by `boardId` and sorting by `order` benefits from `(boardId, order)`. However, a query filtering *only* by `order` won't benefit from this index due to index prefix rules.
* **Alternative Approach**: Single column indexes.
  * *Pros*: Simpler to design and maintain.
  * *Cons*: PostgreSQL must merge index queries, which is slower than using a single compound index.
* **Production Example**: Checking query execution plans using `EXPLAIN ANALYZE` to confirm queries utilize indexes and avoid full-table scans.
* **Cross Questions**: *What is the write overhead of adding indexes?* Every index increases insertion, update, and deletion times, as database indexes must be rebuilt on write.

#### 4. How would you implement a zero-downtime database migration strategy for TaskFlow in production?
* **Detailed Answer**: To run zero-downtime migrations, we must decouple database schema changes from application deployments using the **Expand/Contract pattern** (also known as blue-green deployments).
* **Deep Explanation**: 
  1. *Expand*: Add the new column or table to the database. The database now supports both the old and new schemas.
  2. *Deploy*: Deploy the new application version, which reads from the old schema but writes to both.
  3. *Backfill*: Run a background script to migrate historical data.
  4. *Contract*: Update the application to read from the new schema, then drop the old column/table.
* **Alternative Approach**: Scheduled maintenance windows.
  * *Pros*: Simple, zero risk of schema discrepancies.
  * *Cons*: Requires taking the platform offline, violating SLAs.
* **Production Example**: Modifying the database schema to add a field (like `twoFactorSecret`) as nullable first, then backfilling before adding constraints.
* **Cross Questions**: *What happens if a migration fails halfway through?* PostgreSQL's transactional migrations roll back the schema change automatically, preventing a corrupt state.

#### 5. How would you handle a memory leak in the Node.js backend under high Socket.io load?
* **Detailed Answer**: We would use heap profiling tools (like Chrome DevTools or `clinic.js`) to capture and compare memory snapshots under load. A common source of leaks in Socket.io is stale event listeners. If socket listeners are registered inside loops or client disconnect events fail to clean up resources, memory usage will grow indefinitely.
* **Deep Explanation**: When a socket disconnects, Node's garbage collector cannot free the socket object if reference variables or closures pointing to it remain in memory (e.g., inside global event listeners or setInterval hooks).
* **Alternative Approach**: Vertical scaling and process restarts via PM2.
  * *Pros*: Mitigates memory exhaustion in the short term.
  * *Cons*: Doesn't fix the underlying bug, leading to periodic performance drops.
* **Production Example**: Ensuring all socket listeners are cleaned up: `socket.removeAllListeners()`.
* **Cross Questions**: *How does Node's V8 garbage collector work?* It uses a generational garbage collection strategy, dividing memory into Young (scavenge) and Old (mark-sweep) spaces.

#### 6. How do you secure JWT refresh tokens against replay attacks?
* **Detailed Answer**: We implement **Refresh Token Rotation**. Every time a refresh token is exchanged for a new access token, the server invalidates the used refresh token and returns a new one. If the server receives an invalidated refresh token, it assumes a replay attack has occurred, invalidating the entire family of tokens associated with that user to force a re-login.
* **Deep Explanation**: Storing refresh tokens in HttpOnly cookies with a `tokenFamily` identifier. When a refresh token is used, we check if it is already spent. If yes, it indicates theft, and we delete all active sessions for that token family.
* **Alternative Approach**: Short-lived sessions without refresh tokens.
  * *Pros*: Maximum security, no refresh token store management.
  * *Cons*: Poor user experience, as users must re-authenticate frequently.
* **Production Example**: Storing token IDs (`jti` claim) in a Redis whitelist to verify token validity.
* **Cross Questions**: *Does this prevent CSRF?* Yes, HttpOnly cookies configured with `SameSite=Strict` protect against Cross-Site Request Forgery.

#### 7. How would you implement optimistic UI locking on the server side to handle high-concurrency task movements?
* **Detailed Answer**: We use **Optimistic Concurrency Control (OCC)** using a version counter on tasks. When a client requests a task update, they send the current version number. The server updates the task only if the database version matches the version sent. If successful, the version counter is incremented; otherwise, the transaction fails and the client must refresh.
* **Deep Explanation**:
  ```sql
  UPDATE Task SET columnId = 'new', version = version + 1 WHERE id = 'task-id' AND version = 5;
  ```
  If another update has already changed the version to 6, the query updates 0 rows, prompting the application to trigger a rollback.
* **Alternative Approach**: Row-level locking (`SELECT ... FOR UPDATE`).
  * *Pros*: Guarantees write safety.
  * *Cons*: Degrades database performance by making concurrent requests wait.
* **Production Example**: Standard pattern for collaborative platforms like Google Docs or Figma to handle simultaneous edits.
* **Cross Questions**: *What if the version mismatch happens frequently?* We fallback to conflict resolution strategies (e.g. merging changes or letting the latest timestamp win).

#### 8. How do you handle file attachment uploads to prevent Server Side Request Forgery (SSRF) and Server Path Traversal?
* **Detailed Answer**: 
  1. Path Traversal: Sanitize file names to remove relative paths (e.g., `../`). Never use user-provided filenames to write to the file system directly; generate unique UUIDs instead.
  2. SSRF: If files are fetched from URLs, validate the destination IP to block local network requests (e.g., `127.0.0.1`, `169.254.169.254`).
* **Deep Explanation**: Path traversal allows attackers to overwrite critical system files (like `/etc/passwd`). SSRF allows attackers to access internal cloud metadata services (e.g., AWS IMDS endpoints) by tricking the server into making outbound calls to internal IP addresses.
* **Alternative Approach**: Direct-to-S3 uploads via presigned URLs.
  * *Pros*: Completely bypasses the server, eliminating server path traversal and CPU/memory bottlenecks.
  * *Cons*: Requires managing file size and expiry validation on AWS IAM side.
* **Production Example**: Configuring `multer` to rename files to UUIDs and uploading them to S3/Cloud Storage.
* **Cross Questions**: *How do you verify file sizes securely?* We enforce file size limits inside `multer` configuration and server-side headers (`Content-Length` checks).

#### 9. How would you implement rate limiting in a distributed microservices architecture?
* **Detailed Answer**: We would use a centralized rate limiter backend, storing connection token buckets inside a Redis cluster. Every microservice routes incoming requests through a middleware check that queries Redis using the client's IP or API token to verify quota limits.
* **Deep Explanation**: Implementing the **Token Bucket** or **Leaky Bucket** algorithm in Redis using Lua scripts to ensure atomic execution. This avoids race conditions between concurrent requests from the same user hitting different services.
* **Alternative Approach**: Gateway rate limiting (e.g., Kong, Nginx, or AWS API Gateway).
  * *Pros*: Offloads rate limiting from application servers entirely.
  * *Cons*: Less flexibility for custom user quotas or complex dynamic rules.
* **Production Example**: Storing user request quotas in Redis keys with TTL matching the bucket duration.
* **Cross Questions**: *What happens if Redis becomes unavailable?* We design rate limiters to fail-open, meaning requests are allowed through with a warning alert generated on the system.

#### 10. How would you handle transaction isolation levels in PostgreSQL to prevent phantom reads?
* **Detailed Answer**: Phantom reads occur when a transaction queries a range of rows, and a concurrent transaction inserts a new row in that range. To prevent this, we set the transaction isolation level to **Serializable**, which simulates serial transaction execution.
* **Deep Explanation**: PostgreSQL uses Serializable Snapshot Isolation (SSI), which tracks read locks on indexes. If concurrent writes conflict with these locks, the transaction fails with a serialization error, requiring the application to retry.
* **Alternative Approach**: Using lower isolation levels (e.g., Repeatable Read) with row-level locks.
  * *Pros*: Higher concurrency throughput.
  * *Cons*: Can result in phantom reads or data discrepancies if not guarded with locks.
* **Production Example**: Prisma transactions default to `Read Committed`. For critical queries, we write raw SQL with transaction-level commands.
* **Cross Questions**: *How does the application handle serialization failure errors?* The backend catches code `40001` errors and retries the transaction using a retry policy with jitter.

#### 11. How do you design an audit log system that cannot be tampered with by database administrators?
* **Detailed Answer**: To make audit logs tamper-proof, we implement a **Write-Once-Read-Many (WORM)** pattern or route logs to an external append-only log store (like AWS CloudWatch or Elasticsearch) with IAM policies that block deletion permissions.
* **Deep Explanation**: Inside the application database, we can set row permissions or use database triggers to block updates or deletions on the `ActivityLog` table.
* **Alternative Approach**: Cryptographic log chaining (similar to blockchain structures), where every log hash depends on the hash of the preceding log row.
  * *Pros*: Complete data integrity verification.
  * *Cons*: Computationally expensive and complex query logic.
* **Production Example**: Forwarding application logs via Winston to a secure, write-only log shipping pipeline.
* **Cross Questions**: *What if the application server is compromised?* Attackers could write fake logs, but they still cannot delete or alter historical log records.

#### 12. How would you handle schema migration rollback for a model that has both additions and deletions?
* **Detailed Answer**: We must write custom down-migrations instead of using automated tools. If a migration adds a column and drops another, the rollback must restore the dropped column and populate it with data from the added column before dropping the added column.
* **Deep Explanation**: To rollback cleanly, we must ensure data is not lost. Down-migrations must reconstruct dropped structures and restore historical data from temp tables or log archives.
* **Alternative Approach**: Restoring database backups.
  * *Pros*: Simple, guaranteed recovery to a specific timestamp.
  * *Cons*: Results in data loss for transactions processed after the backup was taken.
* **Production Example**: Executing migrations in sequential steps: expand first, deploy code, check stability, contract schema.
* **Cross Questions**: *How do you test down-migrations?* By running migrations up and down in a staging database before deploying to production.

#### 13. How does the bcrypt algorithm prevent GPU-accelerated brute-force cracking?
* **Detailed Answer**: bcrypt implements a configurable **work factor** (cost parameter) that increases the computational complexity of the hash. It uses a custom version of Blowfish encryption that relies on memory-intensive operations, making GPU parallelization difficult.
* **Deep Explanation**: Unlike MD5 or SHA256, which are fast to execute on GPUs, bcrypt's memory-bound setup requires significant processor cache, limiting GPU cracking capabilities.
* **Alternative Approach**: Argon2id.
  * *Pros*: The winner of the Password Hashing Competition, offering better memory-hardness protection.
  * *Cons*: Less native library availability and higher server memory overhead.
* **Production Example**: Configuring bcrypt work factor to `12` on the backend, balancing security and server CPU usage.
* **Cross Questions**: *What is salt, and how does bcrypt handle it?* Bcrypt generates a random salt automatically and embeds it in the hash output to prevent rainbow table attacks.

#### 14. How would you optimize the React application for low-bandwidth mobile networks?
* **Detailed Answer**: 
  1. Implement route-level code splitting using `React.lazy` and `Suspense` to reduce initial bundle size.
  2. Optimize assets using gzip/brotli compression on the web server.
  3. Cache API requests using service workers or React Query's persistent cache adapters.
* **Deep Explanation**: Code splitting ensures users only download the code required for their active page (e.g., lazy loading the billing dashboard).
* **Alternative Approach**: Creating a lightweight progressive web app (PWA) client.
  * *Pros*: Offline capabilities and high performance.
  * *Cons*: Requires separate codebase maintenance.
* **Production Example**: Setting up Webpack/Vite build splits to group vendor libraries into separate chunks.
* **Cross Questions**: *How does brotli compare to gzip?* Brotli offers 15-20% better compression density, reducing bandwidth usage.

#### 15. How would you design a Disaster Recovery (DR) plan for TaskFlow's PostgreSQL database?
* **Detailed Answer**: We implement **Multi-Region Replication**.
  1. Run a primary database instance in Region A with a synchronous hot-standby in Region B for instant failover (RTO < 5s, RPO = 0).
  2. Set up continuous WAL archiving to S3 for point-in-time recovery (PITR).
* **Deep Explanation**: WAL (Write-Ahead Logging) segments are shipped to secure, versioned storage, enabling us to restore the database to any millisecond within a retention window.
* **Alternative Approach**: Nightly database dumps (pg_dump).
  * *Pros*: Low cost and simple setup.
  * *Cons*: Poor RPO (up to 24 hours of data loss if the server crashes before the next dump).
* **Production Example**: Deploying AWS Aurora Global Databases with cross-region read replicas.
* **Cross Questions**: *What is the difference between RTO and RPO?* Recovery Time Objective (RTO) is the duration of downtime before recovery. Recovery Point Objective (RPO) is the maximum acceptable data loss.

#### 16. How would you secure communications between Socket.io clients and the backend?
* **Detailed Answer**: We enforce TLS/HTTPS on all WebSocket connections. When handshaking, the backend authenticates the client using the JWT passed via query params or request headers, rejecting unauthorized socket handshakes.
* **Deep Explanation**: WebSockets start as an HTTP handshake. We parse cookie headers or authentication queries to authenticate the connection before establishing the persistent TCP connection.
* **Alternative Approach**: Unauthenticated sockets with authentication required on message level.
  * *Pros*: Fast connection handshake times.
  * *Cons*: Vulnerable to resource exhaustion, as unauthorized users can open sockets.
* **Production Example**: Restricting connections to verified sessions in socket middleware.
* **Cross Questions**: *Does WebSocket protect against Man-in-the-Middle (MitM) attacks?* WSS (WebSocket Secure) runs over TLS, encrypting communications to block interception.

#### 17. How do you implement a secure backup-code system for 2FA recovery?
* **Detailed Answer**: We generate 8 to 10 random alphanumeric backup codes during 2FA setup. We hash these codes using bcrypt before storing them in the database. When a backup code is used, it is validated and marked as spent.
* **Deep Explanation**: Saving backup codes in plain text is a security risk. Hashing them ensures they remain secure even if the database is compromised.
* **Alternative Approach**: Sending SMS codes as recovery fallback.
  * *Pros*: Simple recovery flow.
  * *Cons*: SMS is vulnerable to SIM-swapping attacks and network intercept.
* **Production Example**: Standard security pattern used by GitHub, Google, and major identity providers.
* **Cross Questions**: *Why are backup codes one-time use?* Once used, they are exposed, so they must be invalidated to prevent subsequent reuse.

#### 18. How do you mitigate the risk of memory leaks when using Node's EventEmitters?
* **Detailed Answer**: EventEmitters cause memory leaks when listeners are added but not removed. To prevent this:
  1. Use `once()` instead of `on()` for single-use events.
  2. Always call `off()` or `removeListener()` in cleanup code blocks.
* **Deep Explanation**: Node maintains a reference array of listener callbacks. If the parent object is destroyed but the listener reference remains, the garbage collector cannot clean up the object.
* **Alternative Approach**: Using RxJS observables with explicit subscription lifecycles.
  * *Pros*: Structured subscription management.
  * *Cons*: Adds external dependency footprint.
* **Production Example**: Cleaning up React component hooks or backend socket connections on disconnect.
* **Cross Questions**: *What is the default listener limit on an EventEmitter?* 10 listeners. Exceeding this triggers a memory leak warning.

#### 19. How would you handle a distributed denial of service (DDoS) attack targeting your API endpoints?
* **Detailed Answer**: We route application traffic through a Content Delivery Network (CDN) with built-in DDoS protection (like Cloudflare or AWS Shield). These gateways filter out malicious traffic, bad requests, and botnets before they reach our backend servers.
* **Deep Explanation**: CDNs distribute incoming requests across a global edge network, absorbing traffic spikes and executing edge rate limiting.
* **Alternative Approach**: Scaling application instances.
  * *Pros*: Simple vertical buffer.
  * *Cons*: Expensive and ineffective against massive traffic volumes.
* **Production Example**: Configuring Cloudflare Web Application Firewall (WAF) rules to block suspicious IPs.
* **Cross Questions**: *What is an edge rate limiter?* A rate limiter running at edge locations, blocking traffic before it hits the application origin.

#### 20. How would you design a distributed database transaction spanning multiple independent databases?
* **Detailed Answer**: We implement the **Saga Pattern** or the **Two-Phase Commit (2PC)** protocol. In a Saga, we execute a series of local transactions. If any step fails, we run compensating transactions in reverse order to roll back changes.
* **Deep Explanation**: Two-phase commit uses a coordinator to prepare and commit changes, blocking databases until execution completes. Sagas run independently, using messages or orchestrators to manage the transaction lifecycle.
* **Alternative Approach**: Shared monolithic database.
  * *Pros*: Simple, native ACID transaction support.
  * *Cons*: Creates database bottlenecks and limits scalability.
* **Production Example**: Processing billing transactions where payment gateways, local databases, and usage logs must be reconciled.
* **Cross Questions**: *What is a compensating transaction?* An undo operation that reconciles state changes (e.g. canceling an invoice if payment processing fails).

---

## 8. Resume-Based Questions

### Why did you build this?
* **Answer**: I built TaskFlow because existing tools either lack robust real-time collaboration or fail to connect project task execution with project resource costs. I wanted to design a developer-first platform that seamlessly links active task delivery (via Kanban boards) with time logging, billing analysis, and professional invoice generation in a single dashboard.

### What problem does it solve?
* **Answer**: It eliminates the friction of switching between multiple standalone tools for task tracking, time tracking, and invoicing. By keeping these features in a single workspace, we maintain an accurate audit log and can generate billing calculations directly from verified task actions.

### What would you improve?
* **Answer**: I would implement a Redis pub/sub layer for Socket.io to support horizontal scaling, add OAuth support for additional providers (like GitHub), and configure a message queue (like RabbitMQ) to handle background tasks (like email delivery) asynchronously.

### Biggest challenge?
* **Answer**: Designing the real-time collaborative board drag-and-drop workflow. We had to ensure that when a card is moved:
  1. The DB transaction updates related card orders correctly without collision.
  2. The frontend renders the change instantly using optimistic UI.
  3. Real-time updates are broadcasted only to users in that specific project room.

### Biggest failure?
* **Answer**: Early in development, I re-instantiated the Prisma Client on every controller call. During load testing, this quickly exhausted PostgreSQL's connection limits, causing queries to fail under load. I resolved this by refactoring the Prisma Client into a global singleton module.

### Lessons learned?
* **Answer**: I learned the importance of transactional safety in collaborative applications. Without proper database transactions, concurrent edits easily result in corrupt index ordering. Enforcing unique composite constraints at the database level is critical.

---

## 9. Code Review Questions

### Why this function `deleteTimeLog` instead of a generic delete?
* **Answer**: Time logs represent financial data. We need to verify authorization logic: only the user who logged the hours or a workspace Admin/Owner can delete logs. A generic delete endpoint would require writing identical permission checks across various controllers.

### Why this variable `workspaceId` in `verifyWorkspaceRole`?
* **Answer**: Workspace is the top-level authorization boundary. Projects, boards, columns, and tasks all belong to a workspace. Checking permissions at the workspace level ensures we can reuse the same role verification logic across all child resources.

### Why this library `dnd-kit` for drag and drop?
* **Answer**: `dnd-kit` is built specifically for React, lightweight, supports touch devices, and integrates with screen readers. It provides built-in sensors and collision detection helpers, saving us from writing custom drag event listeners.

### Can `req.userId` become null?
* **Answer**: No, the route is protected by `authMiddleware`. If the token is missing or invalid, the middleware intercepts the request, returns `401 Unauthorized`, and blocks execution before it reaches the controller.

---

## 10. Production Readiness

### Logging & Observability
* We use **Winston** to format and write logs to both standard console output and persistent file storage. Logs are categorized by severity levels (`info`, `warn`, `error`) and include timestamps.

### Secrets Management
* Sensitive parameters (like database credentials, JWT secrets, and OAuth keys) are loaded from a `.env` file into `process.env`. In production, these variables are injected via secure environment injection systems (like AWS Parameter Store or GitHub Secrets).

### Health Checks
* We expose a `/health` endpoint that checks the health of the database connection, returning a `200 OK` status only if the database is accessible.

---

## 11. Common Mistakes

* **Generic Database Explanations**: Explaining database lookups without reference to index optimizations or relational constraints.
* **Skipping Concurrency Discussions**: Assuming two users never update the same card at the same time.
* **Storing Secrets in Code**: Hardcoding tokens or API keys inside source code files instead of using environment variables.

---

## 12. Cheat Sheet

* **Core Stack**: Node.js, Express, TypeScript, Prisma (PostgreSQL), React, React Query, Dnd-kit.
* **Security**: bcrypt hashing, JWT access/refresh tokens, TOTP 2FA, rate limiting.
* **Database Key Pattern**: Composite primary keys on `WorkspaceMember([workspaceId, userId])` to prevent duplicate memberships.
* **Concurrency Protection**: Prisma `$transaction` API for column reordering.

---

## 13. Mock Interview

### 1. How does the application handle workspace role updates?
* **Interviewer Expectations**: Verification of permission constraints (e.g. only Owners can update roles, and they cannot demote themselves).
* **Ideal Answer**: The workspace controller verifies the requester's role is `OWNER`. We block users from demoting the last workspace owner to prevent orphaned workspaces.

### 2. What happens if a user inputs an invalid 2FA token?
* **Interviewer Expectations**: Understanding of cryptographical token validation.
* **Ideal Answer**: The verification controller validates the token using `speakeasy`. If validation fails, we return `401 Unauthorized`.

### 3. How does the print layout handle screen-only navigation sidebars?
* **Interviewer Expectations**: Knowledge of CSS media queries for printing.
* **Ideal Answer**: We use a `@media print` query in CSS to set screen elements (like Sidebars or button panels) to `display: none`.

---

## 14. Summary

1. TaskFlow is a secure, real-time workspace linking task execution with resource tracking.
2. The system uses a decoupled client-server architecture with Node/Express and React.
3. Database consistency is maintained via Prisma transactions.
4. Security is enforced through custom authorization middleware and RBAC.
5. All 197 test cases pass successfully.
6. Real-time updates are scoped to specific rooms using Socket.io.
7. Optimistic UI guarantees smooth UI interactions.
8. Sensitive credentials are managed via environment variables.
9. Database lookups are optimized using foreign key indexing.
10. The production build compiles cleanly without errors.
