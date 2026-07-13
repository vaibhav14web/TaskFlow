# Module 02: Architecture & Design Patterns

---

## 1. Purpose

### Why This Module Exists
The **Architecture & Design Patterns** module represents the structural blueprint of TaskFlow. In senior engineering interviews, hiring managers evaluate how a candidate structures their code to achieve loose coupling, scalability, maintainability, and clean separation of concerns. This module details the design choices that dictate how the application scales under load and remains resilient to developer churn.

### What Problem It Solves
A project management app like TaskFlow requires:
1. **Real-time updates**: Collaborative edits (dragging cards, comments) must reach all board members instantly.
2. **Reliable transactions**: Column reordering requires multiple row updates; any failure must rollback cleanly to avoid data inconsistencies.
3. **Decoupled layers**: The client-side interface and server-side state machine must scale independently.

Without clean architectural patterns (like MVC, Singletons, and Middleware chains), a codebase devolves into a spaghetti of nested callbacks, duplicate authorization blocks, memory-leaking socket connections, and database connection exhaustion.

### How It Interacts With Other Modules
The architecture defines the pipeline through which request/response data and events flow:
* **Routing Layer** routes requests to controllers.
* **Middleware Pipeline** intercepts requests for security, rate-limiting, and payload validation.
* **Service Singletons** (e.g., Prisma Client, Socket.io server) run operations against external resources.
* **State Machine** (on the frontend) relies on a declarative query cache (React Query) to keep visual components synchronized with database updates.

### Real-World Analogy
Think of the architecture as a high-volume manufacturing factory.
* The **Express router** is the intake receptionist who routes different parts (requests) to specific assembly lines (controllers).
* **Middlewares** are safety inspectors. They run checks (authentication, safety regulations, measurements) on the incoming parts. If a part is defective, they reject it immediately before it wastes assembly line resources.
* The **Prisma Client Singleton** is the main pipeline to the parts warehouse (database). Having multiple clients would block the lanes; a single coordinator handles all traffic.
* **Socket.io** is the intercom system, broadcasting status updates to all workers on the floor.

---

## 2. High-Level Overview

TaskFlow follows a decoupled client-server architecture. The server acts as a RESTful JSON API and WebSocket broadcaster, while the client acts as a stateful Single Page Application (SPA).

```
[ React Client ]
       |
       +---> HTTP REST Request ---> [ Express Router ]
       |                                   |
       |                                   v
       |                           [ Rate Limiter ]
       |                                   |
       |                                   v
       |                           [ Auth Middleware ]
       |                                   |
       |                                   v
       |                           [ Controllers ] <---> [ Prisma / DB ]
       |                                   |
       |                                   v
       |                           [ Event Broadcast ]
       |                                   |
       +<--- WebSocket (Socket.io) <-------+
```

---

## 3. Detailed Workflow

Let us trace the request-response lifecycle of a task creation request to understand the execution pipeline.

### Sequence: `POST /api/v1/tasks`
1. **Routing**:
   * The client sends a `POST` request to `/api/v1/tasks` with a JSON payload: `{ title: "Fix login bug", columnId: "col-uuid" }`.
   * Express captures the route in [task.routes.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/routes/task.routes.ts) and triggers the middleware chain.
2. **Rate Limiting**:
   * The rate limiter middleware checks the client IP against the rate limit bucket. If allowed, the request passes to the next handler; otherwise, it returns `429 Too Many Requests`.
3. **Authentication**:
   * The `authMiddleware` reads the `Authorization` header, extracts the Bearer token, verifies its signature using the secret key, and binds the decoded user ID to `req.userId`.
4. **Validation**:
   * The request payload is verified against schemas. If validation fails, the middleware returns `400 Bad Request`.
5. **Controller Business Logic**:
   * The request reaches the `createTask` controller function.
   * The controller calls `verifyWorkspaceRole(req.userId, workspaceId, ['MEMBER', 'ADMIN', 'OWNER'])` to authorize the action.
   * If authorized, the controller uses Prisma to create the task and automatically calculate its correct order index at the bottom of the column.
   * An activity log is recorded inside the same database transaction.
6. **Socket Broadcast**:
   * Upon successful database write, the controller triggers the Socket handler.
   * The Socket server emits a `task:created` event containing the task object to the Socket.io room `project:${projectId}`.
7. **Response & Client Sync**:
   * The controller sends a `201 Created` JSON response to the client.
   * Other clients connected to the same project room receive the socket event, trigger a cache invalidation for the board query, and automatically re-fetch the updated state.

---

## 4. Classes

TaskFlow's backend is written in a functional paradigm using Express, with OOP structures represented by Prisma delegates and utility class singletons.

### `SocketService` (Event Coordinator)
* **Purpose**: Coordinates the Socket.io lifecycle, connection setups, and room assignments.
* **Responsibilities**: Manages active connections, handles room joins/leaves, and broadcasts update payloads to project rooms.
* **Relationships**: Integrates with the HTTP server during app startup in [app.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/app.ts).
* **Key Fields**:
  * `io`: The root Socket.io server instance.
* **Why This Design**: Having a centralized Socket service prevents multiple socket servers from competing for ports and simplifies event tracking across different controllers.

---

## 5. Functions

### `errorHandler(err, req, res, next)`
* **Purpose**: Centralized Express error interceptor.
* **Parameters**:
  * `err`: `any` - The thrown error object.
  * `req`: `Request` - Express request object.
  * `res`: `Response` - Express response object.
  * `next`: `NextFunction` - Pass-through callback.
* **Return Value**: `void` (sends a JSON response with status codes).
* **Time Complexity**: $O(1)$.
* **Space Complexity**: $O(1)$.
* **Execution Block**:
  ```typescript
  console.error(err.stack || err);
  
  let status = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  res.status(status).json({
    error: { code, message }
  });
  ```
* **Why Written This Way**: By centralizing error parsing, controllers can forward errors to `next(error)` instead of writing duplicate `try/catch` response blocks, keeping controllers clean and uniform.
* **Possible Improvements**: Integrate with external monitoring services (like Sentry) in production to automatically alert engineers when `500` errors spike.
* **Common Interview Questions**: *Why do we place error handling middleware at the end of the Express application route definitions?* Express runs middlewares in order. Placing the error handler last ensures it catches unhandled exceptions thrown by preceding route controllers.

---

## 6. Architecture Discussion

### SOLID & Clean Architecture in TaskFlow
* **MVC Pattern**: Split into Routes (Endpoints), Controllers (Business Logic & Serialization), and Models (Prisma Schema).
* **Middleware Pattern**: Cross-cutting concerns like logging, request validation, authentication, and authorization are handled in middleware filters before they reach the business logic, achieving a high degree of modular separation.
* **Loose Coupling**: The frontend does not query the database directly; it communicates over standard HTTP JSON APIs and WebSockets. This allows us to swap the database or rewrite the backend entirely without modifying the client interface.
* **Singleton Pattern**: Instantiating connection-heavy resources like the `PrismaClient` once and reusing the instance avoids performance bottlenecks.

---

## 7. Interview Questions

### Easy (15)

#### 1. What does the MVC pattern stand for, and how is it used in TaskFlow?
* **Answer**: Model-View-Controller. Model = Prisma database schemas. View = React frontend components. Controller = Backend request-response handlers (controllers).
* **Explanation**: This separation of concerns prevents data modeling logic from cluttering route definitions or UI components.
* **Follow-up**: *What is the benefit of keeping the Model layer decoupled?* It allows changing database engines without redesigning the UI components.
* **Common Mistakes**: Claiming that the router is the View.

#### 2. What is an Express middleware function?
* **Answer**: A function that has access to the request object (`req`), response object (`res`), and the next middleware function in the application’s request-response cycle.
* **Explanation**: Middlewares execute code, make changes to request/response objects, end requests, or call `next()` to pass execution along.
* **Follow-up**: *How does the application know a middleware is an error handler?* Error-handling middlewares must have exactly four arguments: `(err, req, res, next)`.
* **Common Mistakes**: Forgetting to call `next()` inside a middleware, causing the request to hang indefinitely.

#### 3. Why do we keep the backend server state stateless?
* **Answer**: Statelessness means the server does not store user session data in memory. This allows us to run multiple server instances behind a load balancer without needing session replication.
* **Explanation**: All user state is encoded inside the JWT, which is sent and validated with every incoming request.
* **Follow-up**: *Where is the user’s identity stored?* Decoded from the JWT signature on the backend and saved in memory during request execution.
* **Common Mistakes**: Storing session variables in global server-side arrays.

#### 4. What is a REST API?
* **Answer**: Representational State Transfer. An architectural style for designing networked applications using HTTP methods (GET, POST, PUT, DELETE, PATCH).
* **Explanation**: Routes represent resources (e.g. `/api/v1/tasks`) instead of actions (e.g. `/api/v1/deleteTask`).
* **Follow-up**: *What is the difference between PUT and PATCH?* PUT replaces the entire resource, while PATCH performs partial updates on specific fields.
* **Common Mistakes**: Designing REST paths using verbs (e.g., `/createTask`).

#### 5. Why is the database client structured as a singleton?
* **Answer**: Creating database connections is computationally expensive. The Singleton pattern ensures only one connection pool is created and reused.
* **Explanation**: We instantiate `PrismaClient` once and export it from a central utility module.
* **Follow-up**: *What happens if we don't use a singleton?* The database server runs out of connection handles, rejecting queries.
* **Common Mistakes**: Writing `const prisma = new PrismaClient()` inside every file.

#### 6. What is dependency injection, and do we use it here?
* **Answer**: A design pattern where an object receives its dependencies from external sources rather than creating them internally.
* **Explanation**: Controllers import the database instance from a central utility module, allowing tests to inject mock database engines instead.
* **Follow-up**: *How does this improve testing?* We can mock database outputs without spinning up a real database server.
* **Common Mistakes**: Hardcoding database credentials or instances directly inside controller functions.

#### 7. How does Socket.io establish a connection?
* **Answer**: It starts with an HTTP long-polling handshake and automatically upgrades to a persistent WebSocket TCP connection if the browser supports it.
* **Explanation**: This multi-protocol approach ensures connection reliability even behind restrictive proxy servers.
* **Follow-up**: *What port does it run on?* It shares the HTTP server port (e.g., `5000`) by intercepting incoming WebSocket handshakes.
* **Common Mistakes**: Stating that Socket.io and WebSockets are identical protocols.

#### 8. What is optimistic rendering on the frontend?
* **Answer**: Instantly updating the UI state based on the expected success of an operation, before receiving a server response.
* **Explanation**: If a user drags a task, the card moves instantly. If the server update fails, the UI rolls back to the original state.
* **Follow-up**: *How does React Query support this?* Through mutation lifecycle callbacks like `onMutate` (optimistic write) and `onError` (rollback).
* **Common Mistakes**: Thinking optimistic rendering saves data to the server faster.

#### 9. What is a JWT token, and what are its three parts?
* **Answer**: JSON Web Token. A compact, URL-safe container for exchanging claims. Its parts are: Header, Payload, and Signature.
* **Explanation**: The parts are base64-encoded and separated by dots (`header.payload.signature`).
* **Follow-up**: *Which part prevents token tampering?* The Signature, which is calculated using the secret key.
* **Common Mistakes**: Believing that JWT payloads are encrypted (they are only base64-encoded and can be read by anyone).

#### 10. Why is standard error handling centralized?
* **Answer**: Centralizing errors enforces a consistent JSON response structure and prevents sensitive stack traces from exposing server details.
* **Explanation**: All routes catch errors and forward them to a single error-handling middleware.
* **Follow-up**: *What status code is returned for unhandled exceptions?* `500 Internal Server Error`.
* **Common Mistakes**: Catching errors in controllers and sending custom error responses inline.

#### 11. What is the role of React Query in frontend state management?
* **Answer**: It acts as an asynchronous state manager, handling data fetching, caching, synchronization, and server cache invalidations.
* **Explanation**: Instead of storing server data in global Redux stores, React Query manages cache keys and cache expiries.
* **Follow-up**: *How does it prevent redundant API calls?* By checking if the cache key data is fresh before making outbound network requests.
* **Common Mistakes**: Using React Query for local UI state (like dropdown open/close states).

#### 12. What are React Router Layouts?
* **Answer**: Layout wrappers that render common UI elements (like Sidebars or Headers) around nested child routes.
* **Explanation**: Using layout routes prevents UI elements from re-rendering when navigating between sub-pages.
* **Follow-up**: *How does the layout know where to render children?* Using the `<Outlet />` placeholder component.
* **Common Mistakes**: Declaring the Sidebar inside every individual page component.

#### 13. What is package-lock.json, and why is it checked into source control?
* **Answer**: It locks the exact versions of dependencies installed in `node_modules` to guarantee consistent builds across different environments.
* **Explanation**: It records dependency hashes to prevent environmental drift during local development or production CI/CD builds.
* **Follow-up**: *What happens if it is deleted?* Different developers might install slightly different minor versions of dependencies, leading to environmental bugs.
* **Common Mistakes**: Adding `package-lock.json` to `.gitignore`.

#### 14. What are environment variables?
* **Answer**: Configuration parameters injected into the application runtime from the operating system or deployment environment.
* **Explanation**: They keep sensitive credentials (like database URLs, secret keys) out of source control.
* **Follow-up**: *How are they read in Node?* Via `process.env.VARIABLE_NAME`.
* **Common Mistakes**: Checking `.env` files into public GitHub repositories.

#### 15. What does the build command `npx tsc --noEmit` do?
* **Answer**: Runs the TypeScript compiler to check for type errors without generating output JavaScript files.
* **Explanation**: This allows us to verify compilation health before running full production builds.
* **Follow-up**: *Why do we use it in CI/CD pipelines?* To block broken code integrations early in the build pipeline.
* **Common Mistakes**: Assuming it compiles and runs the application.

---

### Medium (20)

#### 1. How does the request-response lifecycle flow through the Express routing and middleware layers?
* **Interviewer's Intent**: To verify knowledge of the Express runtime model and how request pipelines are constructed.
* **Answer**: When an HTTP request hits the Node server, Express matches the URL path against routes. The request flows through registered middleware functions in order. Each middleware can inspect the request, modify its headers/body, end the response, or invoke `next()` to pass execution to the next handler. Once it reaches the controller, the business logic runs, and the response is returned.
* **Why Interviewer Asks**: This verifies if you can trace how requests are authenticated, authorized, and validated before reaching the database layer.
* **Common Mistakes**: Believing that middlewares run concurrently rather than sequentially.
* **Follow-up**: *What happens if a middleware throws an error?* Express halts the normal middleware chain and forwards the error to the registered error handler.
* **Production Example**: Routing requests through CORS -> Rate Limiter -> Authentication Middleware -> Route Controller.

#### 2. Why did you choose React Query over a global state manager like Redux for server-state caching?
* **Interviewer's Intent**: To test the candidate's understanding of different state archetypes (client state vs. server state).
* **Answer**: Redux is designed for global client state (like UI themes or shopping cart items). Server state is asynchronous, needs periodic synchronization, and requires cache invalidation policies. React Query handles caching, background updates, retry limits, and cache invalidation out-of-the-box, saving us from writing hundreds of lines of boilerplate Redux actions.
* **Why Interviewer Asks**: It shows you select tools based on specific problem spaces rather than using the same framework for everything.
* **Common Mistakes**: Claiming Redux cannot handle asynchronous data fetching.
* **Follow-up**: *Do you still need local state if you use React Query?* Yes, local UI state (like form inputs and dialog toggles) is managed using React's `useState`.
* **Production Example**: Caching project board data under key `['board', projectId]` and invalidating it on task mutations.

#### 3. How do you implement global, structured error handling in Express to avoid crash loops?
* **Interviewer's Intent**: To check error-recovery and server safety design patterns.
* **Answer**: We wrap all asynchronous controller calls in `try/catch` blocks and forward exceptions to `next(error)`. We register a centralized error-handling middleware at the end of the app definition to parse errors and return standardized JSON payloads, preventing unhandled exceptions from crashing the Node.js event loop.
* **Why Interviewer Asks**: Unhandled promise rejections can crash the Node server process, leading to downtime.
* **Common Mistakes**: Writing raw `try/catch` response blocks in every controller.
* **Follow-up**: *How do you catch unhandled rejections outside Express?* By listening to the `unhandledRejection` and `uncaughtException` events on the Node process.
* **Production Example**: Using wrapper functions like `express-async-handler` to automatically route controller errors to the error middleware.

#### 4. How does Socket.io share connection authorization with the REST API layer?
* **Interviewer's Intent**: To test security synchronization across different transport layers (HTTP vs WebSockets).
* **Answer**: We use custom authorization middleware in Socket.io. During the initial connection handshake, the client passes the JWT in the query parameters or request headers. The socket middleware validates the token signature; if valid, the connection is accepted and `socket.userId` is populated. If invalid, the connection is rejected.
* **Why Interviewer Asks**: Unauthenticated sockets allow attackers to consume server resources and listen to private project updates.
* **Common Mistakes**: Allowing unauthenticated socket connections and validating tokens on individual event messages.
* **Follow-up**: *Can we share the Express cookie parser with Socket.io?* Yes, we can parse cookies directly from the socket handshake headers.
* **Production Example**: Verifying connection tokens inside `io.use()` middleware blocks during connection setup.

#### 5. How does optimistic UI rollback work under React Query mutations?
* **Interviewer's Intent**: To evaluate frontend caching mechanics and optimistic mutation design patterns.
* **Answer**: During `onMutate`, we cancel outgoing refetches to prevent race conditions. We snapshot the current query cache, manually update the cache data to simulate success, and return the snapshot. If the API fails, the `onError` callback restores the cache using the returned snapshot.
* **Why Interviewer Asks**: Demonstrates knowledge of how to design a responsive UI without risking UI-database divergence on failure.
* **Common Mistakes**: Modifying the cache directly without saving a rollback snapshot.
* **Follow-up**: *What hook is used for this?* React Query's `useMutation`.
* **Production Example**: Optimistically updating task columns on card drag and rolling back on API timeout.

#### 6. What is the role of request schema validation, and where does it execute?
* **Interviewer's Intent**: To verify security practices regarding input validation.
* **Answer**: Request validation executes at the entry point of the route handler, before the request reaches the controller logic. We validate the structure, types, and values of `req.body`, `req.query`, and `req.params`. This blocks malformed or malicious inputs from reaching the database.
* **Why Interviewer Asks**: Skipping input validation allows SQL injections, XSS payloads, or memory-limit exploits to penetrate core services.
* **Common Mistakes**: Validating inputs inside controllers, leading to cluttered business logic code.
* **Follow-up**: *What status code is returned for validation failures?* `400 Bad Request`.
* **Production Example**: Implementing schemas (e.g. Joi or Zod) as Express middlewares.

#### 7. How does the application maintain loose coupling between components?
* **Interviewer's Intent**: To check dependency management and component separation principles.
* **Answer**: Components do not interact directly with API clients or shared global states. Frontend components fetch data using React Query hooks and delegate mutations to callbacks. Backend controllers delegate database access to the Prisma ORM layer, separating request formatting from database query construction.
* **Why Interviewer Asks**: Tightly coupled code is fragile; updating a database field can break multiple frontend screens if components are directly dependent.
* **Common Mistakes**: Writing API fetch requests directly inside UI components.
* **Follow-up**: *How does this improve testing?* We can mock components or hooks individually.
* **Production Example**: Structuring screens as layout page containers that pass clean properties to presentation components.

#### 8. What is the difference between a stateful and stateless component in React?
* **Answer**: Stateful components declare and manage their own local state. Stateless (presentation) components receive data and handlers via props and focus strictly on rendering the UI.
* **Why Interviewer Asks**: Checks frontend composition patterns.
* **Common Mistakes**: Storing redundant state variables in every child component, leading to sync issues.
* **Follow-up**: *Which is easier to test?* Stateless components, as they are pure functions of their inputs.
* **Production Example**: The `TaskCard` is stateless, while the `BoardPage` is stateful.

#### 9. Why is the Event Loop central to Node.js architecture?
* **Answer**: Node.js is single-threaded, using an Event Loop to handle non-blocking asynchronous operations. The loop delegates I/O operations (like database queries) to the operating system or worker threads, resuming execution once the tasks complete.
* **Why Interviewer Asks**: Tests fundamental understanding of the Node.js runtime environment.
* **Common Mistakes**: Claiming Node.js is multi-threaded for normal execution.
* **Follow-up**: *What happens if you block the event loop?* The server stops responding to all incoming requests.
* **Production Example**: Using asynchronous database methods (`await prisma.task.findMany()`) to keep the event loop free to handle other traffic.

#### 10. How does the client handle token expiration in React Query?
* **Answer**: We intercept API requests using an HTTP client interceptor (like Axios or native fetch wrappers). If a request returns `401 Token Expired`, the interceptor triggers a token refresh, updates the access token, and retries the original request.
* **Why Interviewer Asks**: Tests session persistence and token lifecycle design.
* **Common Mistakes**: Redirecting users to the login page the second their short-lived access token expires.
* **Follow-up**: *How do we block duplicate refresh requests?* By queueing incoming requests while the refresh request is in flight.
* **Production Example**: Configuring interceptors on the base API client.

#### 11. What is the difference between virtual DOM and shadow DOM?
* **Answer**: Virtual DOM is a lightweight React-specific representation of the actual DOM used to calculate rendering updates. Shadow DOM is a browser-native technology used to encapsulate CSS styles inside web components.
* **Why Interviewer Asks**: Clarifies web technology terminology.
* **Common Mistakes**: Conflating the two as the same technology.
* **Follow-up**: *Which one does React use?* Virtual DOM.
* **Production Example**: React calculates DOM diffs on state changes, only updating altered browser nodes.

#### 12. Why do we avoid using wildcards in CORS origins in production?
* **Answer**: Setting `Access-Control-Allow-Origin: *` allows any domain to make requests to our backend API, enabling CSRF and data theft if user sessions are authenticated.
* **Why Interviewer Asks**: Checks API security best practices.
* **Common Mistakes**: Setting origins to `*` to resolve CORS errors quickly.
* **Follow-up**: *What should you use instead?* An origin whitelist checked against incoming request origin headers.
* **Production Example**: Loading CORS whitelist arrays from environment variables.

#### 13. How does the Eventemitter pattern differ from WebSockets?
* **Answer**: EventEmitters handle in-memory event communication within a single Node.js process. WebSockets handle network-based duplex communication between a browser client and a server.
* **Why Interviewer Asks**: Differentiates process communication from network communication.
* **Common Mistakes**: Thinking EventEmitters send messages across the network.
* **Follow-up**: *Can EventEmitters communicate across server instances?* No, they are isolated to the memory space of their running process.
* **Production Example**: Using Socket.io to send network notifications, and Node's event handlers for internal process hooks.

#### 14. What are the benefits of using TypeScript interfaces over types?
* **Answer**: Interfaces support declaration merging (appending properties to existing interfaces) and generally compile faster in larger projects. Types are more flexible for union types, intersection types, and complex mapped types.
* **Why Interviewer Asks**: Tests language-specific optimization knowledge.
* **Common Mistakes**: Using interfaces for union type definitions, which throws compilation errors.
* **Follow-up**: *Can a class implement a type alias?* Yes, if the type represents a static object structure.
* **Production Example**: Defining API response structures using clean type declarations.

#### 15. How does the server handle concurrent Socket.io connections under heavy load?
* **Answer**: We tweak OS limits (increasing open file descriptors via `ulimit`), configure Socket.io with appropriate ping timeouts, and implement clustering using Redis adapters to split connection loads across server instances.
* **Why Interviewer Asks**: Tests server scalability constraints.
* **Common Mistakes**: Assuming a single Node instance can scale to millions of concurrent socket connections out-of-the-box.
* **Follow-up**: *What is the default limit of open files in Linux?* Typically 1024, which limits concurrent connections if not adjusted.
* **Production Example**: Tweaking system parameters in Docker containers or server configurations.

#### 16. What is a race condition in state management?
* **Answer**: A race condition happens when the timing of asynchronous requests causes the UI to display outdated or incorrect data (e.g. user clicks Search, then clicks Category, and the slower Search request finishes last, overwriting the Category results).
* **Why Interviewer Asks**: Evaluates front-end synchronization safety.
* **Common Mistakes**: Ignoring request abort actions on route transitions.
* **Follow-up**: *How does React Query prevent this?* By automatically canceling outgoing queries when new mutations or queries trigger on the same key.
* **Production Example**: Aborting search API calls when the search input changes.

#### 17. How do you implement logging levels on production backend servers?
* **Answer**: We configure logger levels (e.g. `error`, `warn`, `info`, `debug`). In production, we restrict logging output to `info` and `error` to reduce disk write overhead, while leaving `debug` enabled in local development.
* **Why Interviewer Asks**: Logs generate I/O overhead. Proper configuration is critical for performance.
* **Common Mistakes**: Logging full database payloads at `info` level in production.
* **Follow-up**: *How do you analyze logs?* By shipping them to central logs aggregators (like ELK Stack or Datadog).
* **Production Example**: Using Winston to structure logs as JSON objects.

#### 18. What is the difference between client-side routing and server-side routing?
* **Answer**: Client-side routing intercept URL updates, rendering components dynamically without reloading the page. Server-side routing sends a new page document from the server on every link click.
* **Why Interviewer Asks**: Explains SPA single-page application core architecture.
* **Common Mistakes**: Thinking client-side routing makes requests to the server for the page HTML structure.
* **Follow-up**: *Which library handles this in React?* React Router.
* **Production Example**: Navigating from dashboard to board views instantly via React Router links.

#### 19. How do you design a system to handle long-running operations without blocking requests?
* **Answer**: We offload tasks to background worker processes using a message broker (like Redis or RabbitMQ) and task queues (like BullMQ). The API returns a job ID instantly, and the client queries job status or receives updates via sockets.
* **Why Interviewer Asks**: Tests asynchronous system design capability.
* **Common Mistakes**: Running image processing or PDF invoice compilation directly inside the request thread.
* **Follow-up**: *What is this pattern called?* Asynchronous Job Worker pattern.
* **Production Example**: Offloading heavy invoice compilation or PDF print renders to worker queues.

#### 20. What is dry-run validation in migrations?
* **Answer**: Running database migrations against temporary environments or using preview commands to check for syntax errors and schema issues before applying changes to production.
* **Why Interviewer Asks**: Evaluates risk management in production deployments.
* **Common Mistakes**: Running migrations directly against production without verifying SQL execution paths.
* **Follow-up**: *How does Prisma support this?* Through `prisma migrate diff` or running dry-run migration scripts.
* **Production Example**: Verifying migration scripts against local mock databases in CI/CD pipelines.

---

### Hard (20)

#### 1. How would you design a distributed, real-time board collaboration system supporting off-grid edits?
* **Detailed Answer**: To support off-grid (offline) collaboration, we must move from a simple server-authoritative model to using **Conflict-Free Replicated Data Types (CRDTs)** or **Operational Transformation (OT)**. On the client, we capture edits as atomic mutations and queue them locally using IndexedDB. When connection returns, we sync the queue, resolving conflicts using CRDT structures (like Yjs) or last-write-wins timestamps.
* **Deep Explanation**: CRDTs ensure that concurrent edits on different devices eventually converge to the same state without requiring central server arbitration.
* **Alternative Approach**: Centralized Lock management.
  * *Pros*: Simple design, no conflict resolution logic needed on clients.
  * *Cons*: Poor user experience, as offline users cannot edit the board.
* **Production Example**: Collaboration systems like Figma, Trello Offline, or Google Docs.
* **Cross Questions**: *How does Yjs prevent conflict sizes from growing?* It compresses transaction logs and prunes redundant mutation trees once clients sync.

#### 2. How do you prevent event storming bottlenecks in Socket.io when 1,000+ users work on the same board?
* **Detailed Answer**: Event storming occurs when every minor action (mouse move, card hover) triggers broadcasts to all users, overwhelming client browsers and server network cards. 
  1. Implement **throttling and debouncing** on clients to batch operations.
  2. Implement **message aggregation** on the server to send updates in batches (e.g., every 100ms) rather than firing events on every socket call.
  3. Restrict real-time events to critical operations (like task creation or column moves), keeping mouse coordinates off the main WebSocket channel.
* **Deep Explanation**: A board with 1,000 active users sending mouse movements at 60fps generates 60,000 packets per second. Debouncing to 10fps reduces network load by 83% without impacting visual usability.
* **Alternative Approach**: Serverless WebSockets (AWS API Gateway).
  * *Pros*: Scales connection management automatically.
  * *Cons*: High costs and payload serialization latency under high message volume.
* **Production Example**: Trello throttles cursor tracking events and uses low-overhead custom protocols.
* **Cross Questions**: *What transport does Socket.io use under the hood?* Engine.io, which starts with HTTP long-polling before upgrading to WebSockets.

#### 3. How do you handle database transaction lock escalations in PostgreSQL when updating task order indices?
* **Detailed Answer**: In PostgreSQL, updating multiple rows (e.g., shifts indices during drag-and-drop: `UPDATE Task SET order = order + 1 WHERE columnId = X AND order >= Y`) can escalate row-level locks to page or table locks under high write concurrency, blocking other operations. We minimize this by:
  1. Using **relative float indexes** (`order` is a float, so inserting a task between 1 and 2 sets order to 1.5, requiring 0 adjacent row updates).
  2. Indexing columns to ensure queries utilize index-row-locks instead of scanning the table.
* **Deep Explanation**: Floating-point sorting avoids index shifts entirely. We only re-normalize indices (resettling to integers 1, 2, 3) in background jobs when floating-point precision limits are reached.
* **Alternative Approach**: Standard integer reordering in code.
  * *Pros*: Simple, no precision issues.
  * *Cons*: Poor performance, as moving a task to the top of a column with 1,000 tasks requires updating 999 database rows.
* **Production Example**: Jira and mature task boards use float arrays or lexicographical strings (like Lexorank) for task ordering.
* **Cross Questions**: *What is Lexorank?* A sorting algorithm that uses alphanumeric strings (e.g. 'a', 'az', 'b') to allow infinite sorting positions without index updates.

#### 4. How would you design a scalable microservices architecture for TaskFlow, splitting it from our current monolith?
* **Detailed Answer**: We would split the monolith into four domain services:
  1. **Identity & Auth Service**: Manages users, logins, speakeasy 2FA, and issues JWT tokens.
  2. **Board & Workspace Service**: Handles core project management, boards, columns, and tasks.
  3. **Real-time Broadcast Service**: Manages WebSocket connections and receives update events over an AMQP message broker (RabbitMQ/Kafka).
  4. **Billing & Invoicing Service**: Compiles time logs and generates PDFs.
* **Deep Explanation**: Domain services communicate asynchronously using events or synchronously over gRPC to reduce request latency. Shared data (like workspace roles) is cached in Redis to minimize database lookups.
* **Alternative Approach**: Monolithic app with database read replicas.
  * *Pros*: Simple deployment, zero distributed transaction overhead.
  * *Cons*: Codebase remains monolithic, preventing independent scaling of teams or services.
* **Production Example**: Uber and Netflix architectures built on microservices communicating over gRPC.
* **Cross Questions**: *How do you handle distributed transactions across services?* Using the Saga pattern with event-driven orchestrators.

#### 5. How would you design a caching strategy using Redis to reduce database read pressure by 90%?
* **Detailed Answer**: We implement **Cache-Aside Caching** for project boards. 
  1. When a client requests board data, the server checks Redis (`GET board:id`).
  2. If a cache hit occurs, we return the cached JSON instantly.
  3. If a cache miss occurs, we query PostgreSQL, write the result to Redis with a TTL (e.g. 1 hour), and return it.
  4. On database updates (e.g. column added), we invalidate the cache key (`DEL board:id`) to maintain consistency.
* **Deep Explanation**: To handle high traffic, we set up **Cache Stampede protection** using locking (mutual exclusion) so only one server fetches data on cache misses, while others wait for the cache to update.
* **Alternative Approach**: Write-Through Caching.
  * *Pros*: Cache is always up-to-date, minimizing database read misses.
  * *Cons*: Higher write latency and cache storage overhead.
* **Production Example**: E-commerce catalog caching using Redis.
* **Cross Questions**: *What happens if Redis runs out of memory?* We configure Redis eviction policy to `allkeys-lru` (Least Recently Used) to reclaim memory automatically.

#### 6. How do you defend against memory exhaustion attacks targeting Express multipart/form-data file uploads?
* **Detailed Answer**: Attackers can flood the server with large file streams, filling the temporary disk space or exhausting Node's RAM. We mitigate this by:
  1. Setting strict limits in `multer` (e.g. max file size 5MB, max fields, max files).
  2. Streaming files directly to cloud storage (S3) instead of buffering them in memory or writing them to local disk first.
  3. Validating the `Content-Length` header in middleware before parsing the multipart payload.
* **Deep Explanation**: Memory buffering (`multer.memoryStorage()`) stores files in Node's heap memory. Uploading concurrent large files can exceed V8 memory limits, triggering out-of-memory crashes. Disk buffering (`multer.diskStorage()`) protects memory but makes the server vulnerable to disk space exhaustion.
* **Alternative Approach**: Presigned S3 URLs.
  * *Pros*: Client uploads directly to S3, bypassing application servers entirely.
  * *Cons*: Bypasses server-side virus scanning or dynamic image resizing before upload.
* **Production Example**: Processing file uploads using streams directly pipe-lined to AWS S3 buckets.
* **Cross Questions**: *What is the default heap memory limit in Node.js?* On 64-bit systems, it defaults to roughly 1.4GB, but can be configured using `--max-old-space-size`.

#### 7. How would you implement a distributed locks manager using Redis to coordinate resource allocations?
* **Detailed Answer**: We implement the **Redlock algorithm** using Redis. To lock a resource (e.g. compiling an invoice), the server writes a key with a unique value and TTL using the atomic command `SET resource_name my_random_value NX PX 30000` (NX = set only if not exists, PX = millisecond expiry). During release, we use a Lua script to ensure we only delete the key if the value matches, preventing a server from deleting another server's lock.
* **Deep Explanation**: Redlock uses multiple Redis nodes to acquire locks, ensuring locking reliability even if individual Redis instances go down.
* **Alternative Approach**: Database-level locks.
  * *Pros*: No external Redis dependency needed.
  * *Cons*: Locks consume database transaction connection handles, degrading database performance.
* **Production Example**: Managing payment processing or ledger updates across distributed instances.
* **Cross Questions**: *What happens if the lock creator crashes before releasing it?* The lock expires automatically when the TTL (30 seconds) is reached.

#### 8. How would you configure Nginx as a reverse proxy to optimize SSL termination and gzip compression for TaskFlow?
* **Detailed Answer**: We deploy Nginx in front of our application instances. Nginx handles SSL handshake decryption, offloading cryptographic CPU overhead from the Node processes. It acts as a static asset server, serving the React build folder directly and compressing payloads using gzip/brotli before sending them to the client.
* **Deep Explanation**:
  ```
  Client --- HTTPS (SSL terminated at Nginx) ---> Nginx --- HTTP ---> Node.js Server
  ```
  Nginx is optimized for static file I/O and SSL handshakes, freeing the Node.js event loop to process API requests.
* **Alternative Approach**: Handling SSL and compression directly inside the Express application.
  * *Pros*: Simple setup, no separate proxy server configuration required.
  * *Cons*: Degrades Node.js performance by consuming event loop capacity on encryption and compression.
* **Production Example**: Standard production deployment pattern on AWS EC2 or DigitalOcean droplets.
* **Cross Questions**: *What Nginx header must be passed to Node to retain client IPs?* `X-Forwarded-For` and `X-Real-IP`.

#### 9. How do you implement database connection pooling on Prisma, and how do you size the pool?
* **Detailed Answer**: Prisma manages connection pooling automatically using the query engine. We configure the pool size via the database URL parameter `connection_limit=X`. 
  To size the pool: `Pool Size = (Number of Server Instances * Max DB Connections) / Total Node instances`. We must ensure the total connections from all instances do not exceed PostgreSQL's `max_connections` limit (typically 100 by default).
* **Deep Explanation**: A pool that is too small leads to request queues and timeouts. A pool that is too large causes PostgreSQL to waste CPU cycles managing connection context switches.
* **Alternative Approach**: Using a connection pooler proxy like PgBouncer.
  * *Pros*: Supports thousands of client connections by multiplexing them over a small pool of database sessions.
  * *Cons*: Adds infrastructure complexity and limits support for prepared statements.
* **Production Example**: Scaling Prisma instances in Kubernetes using PgBouncer for transaction-mode pooling.
* **Cross Questions**: *What is the default pool size in Prisma?* `Num CPU Cores * 2 + 1`.

#### 10. How would you handle state synchronization conflicts on the frontend when multiple web sockets trigger mutations?
* **Detailed Answer**: Frequent socket updates can cause the UI to flicker or drop user inputs. We mitigate this by:
  1. Using **batching mechanisms** in React Query to group updates within a time window (e.g. 50ms).
  2. Ignoring socket updates for fields or elements the user is actively interacting with (e.g. blocking card position updates if the user is dragging it).
* **Deep Explanation**: If User A is typing a task description while User B updates the task priority, the socket update must only patch the priority field in the local cache, avoiding overwriting User A's active input field.
* **Alternative Approach**: Lock-based UI inputs.
  * *Pros*: Simple, zero risk of input overwrite conflicts.
  * *Cons*: Poor user experience, as inputs are locked when other users edit.
* **Production Example**: Collaborative document editing clients.
* **Cross Questions**: *How does React Query handle merge operations?* Using the `setData` updater callback, which performs shallow merges on cached objects.

#### 11. How would you implement a Canary deployment strategy for your backend services?
* **Detailed Answer**: We route a small percentage of production traffic (e.g., 5%) to the new backend version, while routing the remaining 95% to the stable version. We monitor error rates, performance metrics, and logs on the canary instance before increasing traffic allocation.
* **Deep Explanation**: Using Kubernetes ingress controllers or Cloudflare load balancers to split traffic based on weights, cookies, or user IDs.
* **Alternative Approach**: Blue-Green Deployment.
  * *Pros*: Instant switch, simple rollback path.
  * *Cons*: Requires double the server capacity during deployment.
* **Production Example**: Routing new feature tests to internal team members before public release.
* **Cross Questions**: *How do you rollback a canary deployment?* By setting the canary traffic weight to 0% in the load balancer config.

#### 12. How do you design an API rate limiter that scales to millions of requests per second?
* **Detailed Answer**: At this scale, running rate limiters inside application code blocks degrades performance. We move rate limiting to the edge network (e.g., Cloudflare Workers or AWS CloudFront functions) or API gateway layer (e.g. Kong). We use the Token Bucket algorithm stored in a globally distributed Redis cache.
* **Deep Explanation**: Edge rate limiting stops malicious requests at CDN POPs (Points of Presence) before they consume bandwidth or hit application servers.
* **Alternative Approach**: App-level rate limiting using in-memory maps.
  * *Pros*: Zero external infrastructure dependency.
  * *Cons*: Exhausts server RAM and doesn't scale across multiple instances.
* **Production Example**: Kong API gateway rate limiting.
* **Cross Questions**: *What is the difference between Token Bucket and Fixed Window algorithms?* Fixed Window resets quotas at fixed time boundaries, leading to traffic spikes at window resets. Token Bucket refills tokens continuously, smoothing out traffic rates.

#### 13. How does the browser's Garbage Collector interact with React virtual DOM updates?
* **Detailed Answer**: React's reconciliation process creates and destroys lightweight JavaScript objects representing virtual DOM nodes. If components re-render frequently or closures retain references to obsolete states, memory usage spikes, triggering frequent Garbage Collector cycles that cause UI stutter. We optimize this by using `React.memo`, `useCallback`, and avoiding declaring objects inside rendering loops.
* **Deep Explanation**: When React updates, old virtual DOM nodes lose references and are marked for collection. If components hold references via event listeners, these objects cannot be collected, resulting in memory leaks.
* **Alternative Approach**: Manual DOM updates.
  * *Pros*: Maximum performance control.
  * *Cons*: Highly complex, error-prone, and violates declarative programming paradigms.
* **Production Example**: Optimizing list rendering in large board canvases.
* **Cross Questions**: *How does `useCallback` prevent re-renders?* By returning a memoized version of the callback function, maintaining referential equality between renders.

#### 14. How would you design a database archiving strategy to keep primary database size under 100GB?
* **Detailed Answer**: 
  1. We define an archival policy: Move tasks closed more than 6 months ago to an archive database.
  2. Run cron jobs to batch copy historical records to PostgreSQL read replicas or data warehouses (like Snowflake).
  3. Delete archived records from the primary database and run vacuum processes to reclaim disk space.
* **Deep Explanation**: Keeping the primary database small ensures index files fit entirely in RAM, maintaining high query speeds.
* **Alternative Approach**: Keeping all data in the primary database with partitioning.
  * *Pros*: Simple query patterns, zero replication pipeline required.
  * *Cons*: High storage costs and database index memory overhead.
* **Production Example**: Financial ledger tables partitioned by year, archiving older tables to cold storage.
* **Cross Questions**: *What PostgreSQL command reclaims disk space?* `VACUUM FULL`, which locks the table while rewriting database pages on disk.

#### 5. How would you handle a distributed denial of service (DDoS) attack targeting your application?
* **Detailed Answer**: We deploy a cloud-based web application firewall (WAF) and DDoS protection service (like Cloudflare or AWS Shield). These services run traffic profiling algorithms, checking for signature anomalies, rate anomalies, and known botnets to block traffic before it hits the application origin.
* **Deep Explanation**: DDoS mitigation requires massive bandwidth. Cloud CDNs scale edge capacity to absorb gigabit-level attacks that would crash standard data center networks.
* **Alternative Approach**: Setting up rate limiting on application load balancers.
  * *Pros*: Low cost, simple configuration.
  * *Cons*: Load balancers can still be overwhelmed by volumetric attacks (like UDP floods).
* **Production Example**: Implementing Cloudflare rate limiting and challenge pages (CAPTCHA) during attack detections.
* **Cross Questions**: *What is a Volumetric DDoS attack?* An attack aimed at saturating the network bandwidth of the target site.

#### 16. How would you secure a Node.js process to run inside a Docker container securely?
* **Detailed Answer**: 
  1. Never run the Node.js process as `root`; create and use a dedicated `node` user in the Dockerfile.
  2. Use multi-stage builds to exclude development dependencies and compilation tools from the final production image.
  3. Inject secrets at runtime using environment variables instead of baking them into the Docker image.
  4. Use minimal base images (like Alpine or distroless) to reduce the attack surface.
* **Deep Explanation**: Running as root allows attackers who exploit an application vulnerability to compromise the host OS kernel. Minimal images reduce security vulnerabilities by removing unnecessary utilities (like curl or package managers).
* **Alternative Approach**: Standard single-stage Docker builds.
  * *Pros*: Simple Dockerfile configuration.
  * *Cons*: Large image sizes containing build tools, increasing security vulnerabilities.
* **Production Example**: Writing secure production Dockerfiles using multi-stage builds and the `USER node` directive.
* **Cross Questions**: *What is a multi-stage Docker build?* A build method using multiple `FROM` instructions, allowing you to copy build artifacts from builder stages into a minimal production stage.

#### 17. How do you implement request timeouts in Node.js to prevent slowloris attacks?
* **Detailed Answer**: Slowloris attacks open connections and send headers slowly, keeping connections open and eventually exhausting the server's connection capacity. We mitigate this by setting strict headers and body timeouts on the Node HTTP server configuration.
* **Deep Explanation**:
  ```typescript
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  ```
  If a client fails to send headers within 5 seconds, the server terminates the socket connection.
* **Alternative Approach**: Using Nginx as a reverse proxy to handle connection buffer management.
  * *Pros*: Nginx is highly optimized for asynchronous connection management and buffers slow requests automatically.
  * *Cons*: Adds infrastructure complexity.
* **Production Example**: Standard deployment pattern using Nginx/HAProxy in front of Express.
* **Cross Questions**: *What is a Slowloris attack?* A Denial of Service attack where the attacker keeps connections open by sending partial HTTP requests.

#### 18. How would you design a database replication strategy for scaling reads?
* **Detailed Answer**: We deploy a primary database for write operations and one or more read replicas. We configure the application data clients to route write queries to the primary instance and load-balance read queries across the read replicas.
* **Deep Explanation**: Replicas use streaming replication to keep sync with the primary. Since replication is asynchronous, we must handle replica lag, where a read query hitting a replica returns stale data if executed immediately after a write.
* **Alternative Approach**: Sharding.
  * *Pros*: Scales writes by partitioning data across database servers.
  * *Cons*: Extremely complex query coordination and routing logic.
* **Production Example**: Configuring database client pools with primary and replica connection handles.
* **Cross Questions**: *How do you handle read-after-write consistency?* By routing read queries to the primary database for a short window (e.g. 1 second) after a write operation.

#### 19. How do you design an API versioning strategy that supports backward compatibility?
* **Detailed Answer**: We use URI versioning (e.g. `/api/v1/resource`). When making breaking changes, we release a new route version (`/api/v2/resource`) while keeping `/api/v1/` active. v1 routes can wrap v2 logic, applying compatibility transformations to payloads.
* **Deep Explanation**: Breaking changes include dropping fields, altering datatypes, or changing error codes. Keeping old routes active protects third-party client integrations from breaking.
* **Alternative Approach**: Header versioning (passing version numbers in request headers).
  * *Pros*: Clean URLs.
  * *Cons*: Difficult to test and configure behind caching proxies.
* **Production Example**: Stripe API versioning uses date-based request headers to dynamically transform database outputs to match version schemas.
* **Cross Questions**: *How do you deprecate an old API version?* By sending a `Deprecation` header in responses and giving clients a migration window before shutdown.

#### 20. How would you design a rate limiter that adapts to different API tier quotas?
* **Detailed Answer**: We fetch the user's tier details (e.g. Free, Pro, Enterprise) during authentication and load their quota parameters dynamically. We store tier rate limits in a Redis cache. The rate limiting middleware queries Redis using the user's tier configuration to evaluate bucket quotas.
* **Deep Explanation**: Free tiers might get 60 requests/min, while Enterprise tiers get 10,000 requests/min. We store these parameters alongside active token buckets in Redis to keep validation checks under 2ms.
* **Alternative Approach**: Static ip-based rate limiters.
  * *Pros*: Low database overhead, zero tier lookup queries.
  * *Cons*: Cannot distinguish paid users from free users, limiting monetizability.
* **Production Example**: GitHub API rate limits (unauthenticated vs authenticated quotas).
* **Cross Questions**: *How do you handle rate limit headers?* By returning standard headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

---

## 8. Resume-Based Questions

### Why did you select a Decoupled client-server architecture?
* **Answer**: I chose a decoupled architecture to separate concerns and support independent scaling. The backend exposes a stateless REST API, allowing us to deploy multiple backend instances behind a load balancer. The React frontend is compiled into static assets that can be distributed globally via CDNs, minimizing initial page load times.

### How did you organize the codebase for developer collaboration?
* **Answer**: I structured the codebase as a clean monorepo, splitting directories into `backend` and `frontend`. The backend uses an MVC structure with clear route-controller-service boundaries, while the frontend organizes code into reusable components, pages, context providers, and custom hooks.

### What is the advantage of using TypeScript on both sides of the stack?
* **Answer**: Shared type safety. While we don't share code directly in v1, developers working on either side of the stack benefit from matching interfaces. If an API contract changes, the types compile cleanly, preventing mismatch errors between API payloads and client rendering logic.

---

## 9. Code Review Questions

### Why do you register CORS middleware before the routers?
* **Answer**: CORS checks are executed by the browser via preflight `OPTIONS` requests. If CORS middleware is placed after the routers, the preflight request hits the endpoint directly without CORS headers, causing the browser to block the subsequent API call.

### Can `app.use(errorHandler)` be placed at the top of the file?
* **Answer**: No, Express processes middlewares in the order they are defined. If the error handler is placed first, it cannot catch errors thrown by route handlers defined below it. It must be registered last.

### Why do we configure rate limiting inside `app.ts` instead of server.ts?
* **Answer**: `app.ts` configures the Express application instance, including routes and middlewares. `server.ts` is responsible for starting the HTTP/WebSocket server and listening on ports. Keeping them separate allows us to import the Express application in tests without starting a live server instance, keeping tests fast and clean.

---

## 10. Production Readiness

### SSL Termination
* In production, the backend is deployed behind Nginx or an AWS Application Load Balancer (ALB) that handles SSL termination. This decrypts traffic before forwarding it to the Node.js process over internal networks.

### Load Balancing
* We deploy multiple Node.js instances behind an Nginx load balancer configured with sticky sessions to support WebSockets. This distributes connection loads and provides high availability.

### Process Management
* We use **PM2** to manage the Node.js process in production. PM2 handles automatic restarts on failure, scales instances across CPU cores using cluster mode, and manages logs.

---

## 11. Common Mistakes

* **Incorrect Middleware Ordering**: Registering error handlers before routes, or registering body parsers after routing logic.
* **Ignoring WebSockets Scaling Constraints**: Designing real-time features using local Socket.io memory states without planning for cross-instance communication.
* **Tightly Coupled Components**: Writing backend database queries directly inside routes or API calls inside React components.

---

## 12. Cheat Sheet

* **MVC Pattern**: Routes -> Middlewares -> Controllers -> Models.
* **Centralized Error Handler**: Registered last, has exactly four arguments `(err, req, res, next)`.
* **State Management Separation**: React Query manages server state; `useState` manages UI state.
* **Scalable WebSockets**: Socket.io adapter using Redis pub/sub is required for multiple server instances.

---

## 13. Mock Interview

### 1. What happens if a route controller fails to call `next(error)`?
* **Interviewer Expectations**: Understanding of Express middleware control flows.
* **Ideal Answer**: The error is not forwarded to the centralized error handler. The request hangs or fails silently, and the client receives no response, leading to timeout errors.

### 2. Why do we run static asset serving on Nginx instead of Express?
* **Interviewer Expectations**: Knowledge of I/O performance bottlenecks.
* **Ideal Answer**: Express is single-threaded and optimized for business logic. Nginx is built on an event-driven, non-blocking architecture optimized for high-volume static file I/O, serving files faster and freeing up Node resources.

### 3. How do you implement sticky sessions on a Load Balancer?
* **Interviewer Expectations**: WebSocket protocol handshake requirements.
* **Ideal Answer**: We configure the load balancer to bind a client's session to a specific backend server instance using cookies. This ensures the Socket.io long-polling handshake and WebSocket upgrade requests land on the same instance.

---

## 14. Summary

1. TaskFlow uses a decoupled client-server architecture with stateless APIs.
2. The backend follows the MVC design pattern.
3. Express middlewares handle security, rate limiting, and authentication.
4. Singletons are used to manage heavy database connection pools.
5. Error handling is centralized in a final Express middleware.
6. React Query separates server state caching from client UI states.
7. Socket.io requires a Redis adapter to scale across multiple instances.
8. SSL termination is handled at Nginx to offload decryption from Node.js.
9. Route controllers catch errors and forward them using `next(error)`.
10. System configurations are managed using environment variables.
