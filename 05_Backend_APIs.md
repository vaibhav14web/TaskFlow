# Module 05: Backend APIs & Controllers

---

## 1. Purpose

### Why This Module Exists
The **Backend APIs & Controllers** module represents the logical interface of TaskFlow. In senior engineering interviews, candidates must explain how they design RESTful endpoints, decouple request validation from business logic, structure middleware chains, manage database transactions, and handle HTTP serialization to deliver stable and high-performing APIs.

### What Problem It Solves
TaskFlow coordinates multiple transactional entities:
* Handling nested resource mutations (e.g. creating a task inside a column).
* Managing workspace memberships and role validations.
* Aggregating time logs into billing reports.

Structuring these operations into routes and controllers prevents code duplication, separates concerns, simplifies testing, and enforces security policies consistently.

### How It Interacts With Other Modules
This module routes incoming client requests:
* Parses headers to extract JWTs verified in the **Authentication Module**.
* Queries data using database delegates from the **Database Module**.
* Returns serialized JSON payloads to the **Frontend Module**.

```
[ Client Request ]
       |
       v
  [ Router ] ---> [ Middleware Verification ] ---> [ Controller Handler ]
                                                           |
                                                           v
                                                  [ RBAC / DB Client ]
                                                           |
                                                           v
[ Client Response ] <--- [ JSON Serialization ] <-----+
```

### Real-World Analogy
Think of the API layer as a restaurant ordering counter.
* The **Route** is the menu item selected by the customer.
* The **Router** is the waiter who takes the order ticket.
* The **Middleware** is the kitchen validation checklist: verifying the customer has paid (auth), checks for food allergies (input validation), and checks if the table is reserved (RBAC checks).
* The **Controller** is the chef who gathers ingredients (database models), cooks the meal (computes business logic), and plates it (serializes the response).

---

## 2. High-Level Overview

TaskFlow's backend API uses Express and TypeScript. Routes are mapped in `src/routes/` and business logic is handled in `src/controllers/`.

---

## 3. Detailed Workflow

Let us trace a project deletion request: **An administrator deletes Project X.**

### Execution Sequence
1. **Routing & Identification**:
   * The client sends a `DELETE /api/v1/projects/:projectId` request.
   * The request is routed to the project router and intercepted by `authMiddleware`.
2. **Access Verification**:
   * The controller fetches the project record to identify its parent `workspaceId`.
   * It calls `verifyWorkspaceRole(userId, workspaceId, [Role.OWNER, Role.ADMIN])` to verify the user has deletion permissions. If validation fails, it throws a `Forbidden` exception.
3. **Database Execution**:
   * The controller calls `prisma.project.delete({ where: { id: projectId } })`.
   * Because `onDelete: Cascade` is configured, PostgreSQL automatically deletes all dependent boards, columns, tasks, comments, and time logs.
4. **Response Serialization**:
   * The database returns the deleted project details.
   * The controller serializes the output into a standardized JSON response: `200 OK` with `{ data: { message: "Project deleted successfully." } }`.
   * If the project is not found, the controller catches the error and forwards it using `next(error)`.

---

## 4. Classes (API Models)

API interfaces are represented by TypeScript type schemas defining request payloads.

### `AuthenticatedRequest` (Type Extension)
* **Purpose**: Extends the default Express request object to hold verified session metadata.
* **Key Fields**:
  * `userId`: `string` (The authenticated user ID decoded from the JWT).
* **Why This Design**: Extending Express request interfaces allows security middlewares to pass user identities to subsequent controllers without resorting to global scope variables.

---

## 5. Functions

### `createColumn(req, res, next)`
* **Purpose**: Creates a new board column and calculates its order index.
* **Parameters**:
  * `req.body.name`: `string`
  * `req.body.boardId`: `string`
* **Return Value**: JSON object containing the created column details.
* **Time Complexity**: $O(N)$ where $N$ is the number of existing columns.
* **Execution**:
  ```typescript
  const { name, boardId } = req.body;
  const count = await prisma.column.count({ where: { boardId } });
  const column = await prisma.column.create({
    data: { name, boardId, order: count }
  });
  res.status(201).json({ data: column });
  ```
* **Why Written This Way**: Using `count` to determine the order index places the new column at the end of the list.
* **Possible Improvements**: Implement a transaction block to prevent concurrent creations from generating duplicate order values.

---

## 6. Architecture Discussion

### Controller Cleanliness & REST Best Practices
* **Controller Isolation**: Controllers are isolated functions that accept standard Express request, response, and next arguments, keeping them easy to unit test.
* **JSON Consistency**: All API responses use a standard wrapper: `{ data: ... }` on success, and `{ error: { code: ..., message: ... } }` on failure.

---

## 7. Interview Questions

### Easy (15)

#### 1. What does REST stand for?
* **Answer**: Representational State Transfer. An architectural style for designing APIs based on resources.
* **Explanation**: REST APIs use standard HTTP methods and return stateless resources, usually in JSON format.
* **Follow-up**: *What are the key REST constraints?* Statelessness, client-server separation, uniform interface, and cacheability.
* **Common Mistakes**: Claiming that REST requires specific programming languages.

#### 2. What is the HTTP status code `201 Created` used for?
* **Answer**: Indicates that a request succeeded and resulted in the creation of a new database resource.
* **Explanation**: We return `201` when tasks, columns, or time logs are successfully created.
* **Follow-up**: *What header should optionally accompany a 201 response?* The `Location` header containing the URL of the new resource.
* **Common Mistakes**: Returning `200 OK` for resource creations.

#### 3. What is the difference between `req.params` and `req.query` in Express?
* **Answer**: `req.params` contains route parameters parsed from the URL path (e.g. `/tasks/:id`). `req.query` contains key-value pairs parsed from the URL query string (e.g. `?priority=HIGH`).
* **Explanation**: We use path parameters to identify specific resources and query parameters for filtering, sorting, or pagination.
* **Follow-up**: *How does Express handle query arrays?* Multiple parameters with the same key are parsed into an array.
* **Common Mistakes**: Using query strings to identify unique primary resources.

#### 4. Why do we parse JSON payloads in Express?
* **Answer**: HTTP bodies are transmitted as raw text streams. Express needs parsing middleware to parse the text and bind the parsed object to `req.body`.
* **Explanation**: We configure this using `app.use(express.json())` at the application setup.
* **Follow-up**: *What happens if the client sends invalid JSON?* The parser middleware throws a syntax error, causing the request to fail before reaching the router.
* **Common Mistakes**: Forgetting to register the JSON parser middleware before route definitions.

#### 5. What does the HTTP status code `400 Bad Request` indicate?
* **Answer**: The server cannot process the request due to client-side errors, such as malformed request syntax or missing parameters.
* **Explanation**: We return `400` when validation checks fail on input payloads.
* **Follow-up**: *How does it differ from 422 Unprocessable Entity?* 400 is for malformed syntax; 422 is for semantically invalid data.
* **Common Mistakes**: Returning `500` for client-side input errors.

#### 6. What is path traversal in API design?
* **Answer**: A security vulnerability where attackers submit relative directory paths (e.g. `../`) to access unauthorized files on the server.
* **Explanation**: We prevent this by sanitizing file uploads and generating unique UUIDs for file storage instead of using user-provided names.
* **Follow-up**: *What Node module helps sanitize paths?* The `path` module (`path.basename`).
* **Common Mistakes**: Storing uploaded files using user-provided names directly on the local disk.

#### 7. Why do we version our APIs (e.g. `/api/v1`)?
* **Answer**: To allow making breaking changes in future releases without breaking existing client integrations.
* **Explanation**: Old API versions remain active while clients transition to new versions.
* **Follow-up**: *What are alternative versioning strategies?* Header-based versioning and query parameter versioning.
* **Common Mistakes**: Changing API response payloads without updating route versions.

#### 8. What is the purpose of the HTTP `DELETE` method?
* **Answer**: To request that the server delete the resource identified by the URL path.
* **Explanation**: We use `DELETE` to remove tasks, columns, and projects.
* **Follow-up**: *Is DELETE idempotent?* Yes, requesting the deletion of a resource multiple times should result in the same server state.
* **Common Mistakes**: Writing delete requests using `POST` or `GET` methods.

#### 9. What is the role of `express-async-handler`?
* **Answer**: A utility wrapper that automatically catches exceptions in asynchronous route handlers and forwards them to the centralized error handler.
* **Explanation**: It eliminates the need to write redundant `try/catch` blocks inside every async controller function.
* **Follow-up**: *What happens if an async error is not caught?* The request hangs, and Node logs an unhandled promise rejection warning.
* **Common Mistakes**: Thinking it resolves promise execution times.

#### 10. What is an API Gateway?
* **Answer**: A server proxy that acts as an entry point for APIs, handling cross-cutting concerns like routing, authentication, and rate limiting.
* **Explanation**: While TaskFlow is monolithic in v1, microservice deployments utilize gateways to distribute requests.
* **Follow-up**: *What is the benefit of gateways in microservices?* They hide internal network topology from public clients.
* **Common Mistakes**: Deploying microservices without a centralized API entry point.

#### 11. What is the HTTP status code `403 Forbidden` used for?
* **Answer**: Indicates that the server understands the user's identity but refuses to authorize the requested action.
* **Explanation**: We return `403` when RBAC checks fail (e.g. a Viewer attempts to delete a project).
* **Follow-up**: *How does it differ from 401 Unauthorized?* 401 is for authentication (identity check); 403 is for authorization (permissions check).
* **Common Mistakes**: Returning `401` when the user is logged in but lacks permissions.

#### 12. Why do we set security headers in API responses?
* **Answer**: To protect users from browser-side vulnerabilities like clickjacking, XSS, and content-type sniffing.
* **Explanation**: We configure this using middleware like `helmet`.
* **Follow-up**: *What header prevents clickjacking?* `X-Frame-Options`.
* **Common Mistakes**: Assuming backend APIs do not need security headers because they don't serve HTML.

#### 13. What is the role of `express.urlencoded` middleware?
* **Answer**: It parses incoming requests with URL-encoded payloads, typically sent by HTML form submissions.
* **Explanation**: It binds form parameters to `req.body`.
* **Follow-up**: *What does the `extended: true` option do?* It allows parsing nested object structures using the `qs` library.
* **Common Mistakes**: Registering it when the API only accepts JSON payloads.

#### 14. What is pagination, and why is it used?
* **Answer**: Splitting large data lists into smaller pages to improve API response speeds and reduce database read pressure.
* **Explanation**: Instead of returning all tasks, we use query parameters (like `limit` and `page`) to fetch subsets.
* **Follow-up**: *What are the two common pagination strategies?* Offset-based pagination and Cursor-based pagination.
* **Common Mistakes**: Fetching and sending entire tables to the client.

#### 15. What does the HTTP status code `404 Not Found` indicate?
* **Answer**: The server cannot find the requested resource.
* **Explanation**: We return `404` when queried tasks, columns, or projects do not exist.
* **Follow-up**: *Should we return 404 for missing tables?* No, missing tables indicate a server-side error (`500`).
* **Common Mistakes**: Returning `200` with an empty data payload when a specific resource ID is missing.

---

### Medium (20)

#### 1. How do you design and structure Express routing to keep a large codebase maintainable?
* **Interviewer's Intent**: To check clean coding patterns and routing modularity in Express applications.
* **Answer**: We use nested routers. We create a master router (`app.ts`) that mounts feature routers (e.g., `authRouter`, `taskRouter`) under specific path prefixes. Each feature router defines its endpoints, maps validation and security middlewares, and delegates execution to controllers.
* **Why Interviewer Asks**: Monolithic route files quickly become difficult to navigate and maintain as applications scale.
* **Common Mistakes**: Defining all routes and inline controller logic inside a single `app.ts` file.
* **Follow-up**: *How do you configure route-level middlewares?* By passing them as arguments to the route method before the controller callback (e.g. `router.post('/', authMiddleware, validateSchema, createController)`).
* **Production Example**: standard routing layouts in enterprise Node.js frameworks.

#### 2. What is the difference between Offset-based and Cursor-based pagination?
* **Interviewer's Intent**: To check database optimization and data retrieval scaling strategy selection.
* **Answer**: Offset-based pagination uses `LIMIT` and `OFFSET` queries. It is simple but slows down as offset values grow, because the database must scan and discard preceding rows. Cursor-based pagination queries keyset coordinates (e.g. `WHERE id > cursor LIMIT X`), which maintains consistent performance regardless of dataset size.
* **Why Interviewer Asks**: Using offset pagination on tables with millions of rows can cause database performance degradation.
* **Common Mistakes**: Defaulting to offset pagination for high-volume infinite scroll lists.
* **Follow-up**: *Which is suited for real-time task boards?* Cursor-based pagination, as offset pagination can result in duplicate or skipped records if rows are inserted/deleted during navigation.
* **Production Example**: Twitter and Slack APIs utilize cursor-based pagination.

#### 3. How do you handle schema updates in REST APIs without breaking client applications?
* **Interviewer's Intent**: To check backward-compatibility management and API design lifecycle practices.
* **Answer**: We enforce API versioning. When making breaking changes (like renaming keys or dropping fields), we release a new API route version (`/api/v2/`) while keeping `/api/v1/` active. v1 controllers can map and transform database outputs to match the old schema contract.
* **Why Interviewer Asks**: Dropping fields in production without versioning can crash mobile apps or third-party client integrations.
* **Common Mistakes**: Deploying breaking schema updates directly to production routes.
* **Follow-up**: *What is header-based versioning?* Passing the version number in custom headers (e.g. `Accept-Version: v2`) to route requests dynamically.
* **Production Example**: Stripe's dynamic version transformation layers.

#### 4. How does the backend prevent parameter pollution attacks in Express?
* **Interviewer's Intent**: To check security practices regarding query parameter parsing.
* **Answer**: Parameter pollution happens when attackers send duplicate query parameters (e.g. `?id=1&id=2`), tricking Express into parsing the values into an array, which can bypass query validations. We prevent this by registering middleware like `hpp` (HTTP Parameter Pollution) to sanitize query objects.
* **Why Interviewer Asks**: Parameter pollution can bypass string validations, causing database query exceptions or logic errors.
* **Common Mistakes**: Assuming query parameters are always parsed as strings.
* **Follow-up**: *How does `hpp` resolve duplicate keys?* It keeps only the last value, moving duplicates to `req.query.pollution`.
* **Production Example**: Express security middleware configurations.

#### 5. What are the benefits of using a transactional outbox pattern for sending emails on API mutations?
* **Interviewer's Intent**: To check microservice reliability and transaction management designs.
* **Answer**: Sending emails directly inside route controllers can block API requests if the mail server is slow or fails. The Transactional Outbox pattern writes mail events to a database table (`Outbox`) within the same database transaction. A separate background process polls this table and sends emails asynchronously, guaranteeing delivery without blocking API execution.
* **Why Interviewer Asks**: Outbound network requests inside transactions degrade API performance and risk rolling back valid database updates if email delivery fails.
* **Common Mistakes**: Making synchronous SMTP connections inside controller functions.
* **Follow-up**: *What library handles asynchronous polling queues?* BullMQ or custom worker daemons.
* **Production Example**: Notifications systems in large-scale SaaS platforms.

#### 6. How do you implement request timeouts in Express, and what happens when they expire?
* **Interviewer's Intent**: To check server reliability and connection management.
* **Answer**: We register timeout middleware (like `connect-timeout`). If a request runs longer than the threshold (e.g. 10s), the middleware intercepts execution, returns a `503 Service Unavailable` response, and marks the request as timed out. Controller code must check `req.timedout` to halt subsequent database writes.
* **Why Interviewer Asks**: Unbounded operations can lock connections and exhaust server memory under high traffic.
* **Common Mistakes**: Assuming timeout middlewares stop running asynchronous code blocks automatically.
* **Follow-up**: *How do you prevent writing data after a timeout?* By checking `req.timedout` before executing database queries.
* **Production Example**: Standard security policies in microservice gateways.

#### 7. How does the HTTP `PATCH` method differ from `PUT`, and how did you implement it?
* **Interviewer's Intent**: To check REST syntax standards and partial resource update capabilities.
* **Answer**: `PUT` replaces the entire resource. `PATCH` performs partial updates, modifying only the fields submitted in the request body. In our task controllers, we use Prisma's update method, passing only the defined parameters from `req.body` to execute partial SQL updates.
* **Why Interviewer Asks**: Using PUT for small modifications (like toggling checkbox status) forces clients to send entire payloads, increasing bandwidth usage and risking data loss.
* **Common Mistakes**: Requiring full schemas for small field updates.
* **Follow-up**: *What is JSON Patch?* A standardized format (RFC 6902) for describing patch modifications using operations lists (e.g. add, remove, replace).
* **Production Example**: Task status updates in Kanban boards.

#### 8. How do you design APIs to prevent mass assignment vulnerabilities?
* **Interviewer's Intent**: To verify secure request parsing practices.
* **Answer**: We avoid passing `req.body` directly to database methods. Instead, we destructure and whitelist only the fields expected for the operation (e.g. `const { title, description } = req.body`), blocking clients from writing unauthorized columns (like `role` or `ownerId`).
* **Why Interviewer Asks**: Pass-through queries allow malicious users to elevate their privileges by submitting extra fields (like `role: 'ADMIN'`) in request payloads.
* **Common Mistakes**: Writing `prisma.user.update({ data: req.body })`.
* **Follow-up**: *What tool can enforce this?* Schema validators like Joi or Zod.
* **Production Example**: Whitelist sanitization filters in controller inputs.

#### 9. Why is response serialization important, and how do you protect sensitive fields?
* **Answer**: Databases store sensitive records (like password hashes or secrets). Response serialization parses outputs, stripping out sensitive fields before returning the JSON payload to the client.
* **Why Interviewer Asks**: Prevents accidental data leaks in API responses.
* **Common Mistakes**: Returning raw database user objects directly to public clients.
* **Follow-up**: *How does Prisma handle this?* We can exclude sensitive fields in our select queries or strip them manually in controller serializers.
* **Production Example**: Stripping `passwordHash` and `twoFactorSecret` from user profiles.

#### 10. How do you design APIs that handle file downloads efficiently?
* **Answer**: We avoid buffering entire files into memory. Instead, we read files as streams and pipe them directly to the Express response object (`fs.createReadStream().pipe(res)`), keeping server memory usage low and constant.
* **Why Interviewer Asks**: Buffering large files in memory can crash Node processes under concurrent downloads.
* **Common Mistakes**: Reading files using `fs.readFileSync` before returning them.
* **Follow-up**: *What header specifies file downloads in browsers?* `Content-Disposition: attachment; filename="..."`.
* **Production Example**: Downloading PDF invoices or attachments.

#### 11. What is the role of the `Next` callback in Express?
* **Answer**: It tells Express to pass control to the next middleware in the routing chain. If called with an argument (`next(error)`), Express bypasses normal routes and passes execution to the registered error handler.
* **Why Interviewer Asks**: Essential Express control flow knowledge.
* **Common Mistakes**: Forgetting to call `next()` or return responses, causing requests to hang.
* **Follow-up**: *Can you pass values in next() other than errors?* No, Express treats any argument passed to `next()` as an error.
* **Production Example**: Passing controller errors using `catch (err) { next(err); }`.

#### 12. How do you check if an incoming UUID string is valid in API parameters?
* **Answer**: We use validation middlewares that test parameters against UUID regex patterns (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`), blocking malformed strings before they hit the database.
* **Why Interviewer Asks**: Querying invalid UUID formats causes PostgreSQL to throw syntax exceptions.
* **Common Mistakes**: Passing parameters directly to database queries without checking formats.
* **Follow-up**: *What status code is returned for invalid formats?* `400 Bad Request`.
* **Production Example**: Parameter validation schemas in Express.

#### 13. What is the HTTP status code `429 Too Many Requests`?
* **Answer**: An error response indicating that the client has exceeded their allowed rate limit quota.
* **Why Interviewer Asks**: Tests API rate limiting and security knowledge.
* **Common Mistakes**: Returning generic `500` errors for rate-limited calls.
* **Follow-up**: *What headers should accompany a 429 response?* `Retry-After` specifying the wait duration in seconds.
* **Production Example**: Rate limiting login attempts.

#### 14. How do you handle CORS preflight requests in Express?
* **Answer**: Preflight requests use the HTTP `OPTIONS` method. We register CORS middleware at the top of our application, which automatically intercepts `OPTIONS` requests, appends access-control headers, and returns a `204 No Content` response.
* **Why Interviewer Asks**: Explains browser-native security flows.
* **Common Mistakes**: Defining CORS headers only on specific controllers, which fails preflight validation.
* **Follow-up**: *Why do browsers send preflight requests?* To verify if the server allows cross-origin requests before sending the actual request payload.
* **Production Example**: `cors()` middleware configuration.

#### 15. What are the benefits of keeping business logic out of router files?
* **Answer**: It maintains code readability, separates routing configurations from processing logic, and makes controllers reusable and easier to unit test.
* **Why Interviewer Asks**: Tests codebase organization skills.
* **Common Mistakes**: Writing multi-line database queries directly inside router callbacks.
* **Follow-up**: *What is this pattern called?* Controller-Router separation.
* **Production Example**: TaskFlow router-controller layout.

#### 16. What is idempotency, and which HTTP methods are idempotent?
* **Answer**: Idempotency means executing a request multiple times results in the same server state as a single execution. Idempotent methods include `GET`, `PUT`, `DELETE`, `HEAD`, and `OPTIONS`.
* **Why Interviewer Asks**: Important REST standard constraint.
* **Common Mistakes**: Assuming `POST` is idempotent (repeated POST calls create duplicate resources).
* **Follow-up**: *How do you make POST requests idempotent?* By using idempotency keys (`Idempotency-Key` headers) to verify and cache request outcomes.
* **Production Example**: Stripe payment APIs use idempotency keys.

#### 17. How do you design an API to handle optional query parameters?
* **Answer**: We parse `req.query` and dynamically construct the database query. In Prisma, we build an object containing filter options and pass it to the search parameters.
* **Why Interviewer Asks**: Tests query building patterns.
* **Common Mistakes**: Writing separate database queries for every combination of query filters.
* **Follow-up**: *How do you handle default values?* By setting fallback values directly during query object construction.
* **Production Example**: Filtering tasks by priority and search queries in `BoardPage`.

#### 18. What is the HTTP status code `503 Service Unavailable`?
* **Answer**: Indicates that the server is temporarily unable to process the request, typically due to maintenance or overload.
* **Why Interviewer Asks**: Differentiates server overload from code errors.
* **Common Mistakes**: Returning `500` when database connection pools are temporarily exhausted.
* **Follow-up**: *Can this be returned during deployment?* Yes, load balancers return `503` if no backend instances are active.
* **Production Example**: Returning 503 during maintenance windows or server shutdowns.

#### 19. How do you parse and validate nested JSON arrays in request payloads?
* **Answer**: We use validation schemas that support nested definitions, verifying types and contents of nested objects.
* **Why Interviewer Asks**: Tests payload validation complexity.
* **Common Mistakes**: Validating only top-level parameters, allowing corrupt data to slip into nested records.
* **Follow-up**: *What library does this?* Zod or Joi schemas.
* **Production Example**: Validating checklist item arrays during task creation.

#### 20. What is the difference between path parameters and query parameters in REST?
* **Answer**: Path parameters are part of the URL path, used to identify specific resources (e.g. `/users/123`). Query parameters are appended to the URL, used to sort, filter, or paginate resources (e.g. `/users?role=admin`).
* **Why Interviewer Asks**: Explains standard API structure design.
* **Common Mistakes**: Swapping the use cases, leading to confusing API paths.
* **Follow-up**: *Can path parameters be optional?* Typically no, path parameters are required to resolve the URL route.
* **Production Example**: Standard task board routes.

---

### Hard (20)

#### 1. How would you design a rate-limiting middleware that dynamically varies limits based on subscription tiers (Free, Pro, Enterprise) stored in PostgreSQL?
* **Detailed Answer**: To achieve this without querying the database on every API call, we implement a **hybrid Redis cache** approach.
  1. Authenticate the user and decode their `userId` and subscription tier.
  2. Read active rate limit quotas for their tier from Redis. If it's a cache miss, we query PostgreSQL and write the parameters (e.g., `rate_limit:pro = 1000`) to Redis with a 24h TTL.
  3. Run a Token Bucket script in Redis using Lua to track usage: `rate_limit:user_id`.
  4. If tokens are available, allow the request; otherwise, return `429 Too Many Requests`.
* **Deep Explanation**: Lua scripts in Redis run atomically, preventing race conditions between concurrent requests from the same user hitting different instances.
* **Alternative Approach**: App-level rate limiting.
  * *Pros*: Simple, zero external infrastructure dependency.
  * *Cons*: RAM usage spikes under load, and limits are not shared across server instances.
* **Production Example**: Dynamic rate limiters in cloud gateways like Kong.
* **Cross Questions**: *What headers should accompany a 429 response?* `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After`.

#### 2. How do you implement a secure and idempotent payment execution API?
* **Detailed Answer**: We require clients to send an `Idempotency-Key` header (usually a UUID v4) with `POST` requests.
  1. The API checks the database for a processed request matching the key: `SELECT * FROM Idempotency WHERE key = X`.
  2. If found, we return the cached response payload instantly without repeating execution.
  3. If not found, we insert the key with a status of `PROCESSING` inside a transaction.
  4. Execute the payment with the payment gateway.
  5. Update the status to `SUCCESS` or `FAILED` and save the response payload.
* **Deep Explanation**: This prevents double-spending or duplicate charges if network drops cause the client to retry requests.
* **Alternative Approach**: Client-side transaction tracking.
  * *Pros*: Simple backend, zero idempotency tables needed.
  * *Cons*: Attacker-friendly, as client apps can easily bypass validation checks.
* **Production Example**: Idempotency models in Stripe or PayPal APIs.
* **Cross Questions**: *What if the client retries while status is still PROCESSING?* We return a `409 Conflict` status, telling the client the transaction is in progress.

#### 3. How would you handle slow database query alerts in production to prevent API timeouts?
* **Detailed Answer**:
  1. Enable `pg_stat_statements` on the PostgreSQL database to track execution metrics.
  2. Set query logging limits in Prisma/Express: log queries taking over 200ms.
  3. Route logs to monitoring systems (like Datadog) to alert engineers.
  4. Optimize queries using index plans (`EXPLAIN ANALYZE`), rewrite inefficient joins, or implement cache layers.
* **Deep Explanation**: Slow queries lock database connection pools, causing incoming API requests to queue and time out.
* **Alternative Approach**: Increasing request timeouts.
  * *Pros*: Temporarily reduces timeout errors.
  * *Cons*: Exacerbates resource exhaustion, eventually causing server crashes.
* **Production Example**: Query monitoring configurations.
* **Cross Questions**: *How do you read a query plan?* We check for `Sequential Scans` (indicates missing indexes) vs `Index Scans`.

#### 4. How would you design a distributed tracing system to track requests across microservices?
* **Detailed Answer**: We use **OpenTelemetry** with a tracing exporter (like Jaeger). The gateway generates a unique `traceId` (trace context header) and appends it to all outbound HTTP/gRPC requests. Every downstream service reads the header, records execution spans, and forwards the trace context, enabling us to trace request flows across services.
* **Deep Explanation**: Distributed tracing maps the complete path of a request, making it easy to identify latency bottlenecks in microservice architectures.
* **Alternative Approach**: Log aggregation using unique correlations IDs.
  * *Pros*: Simple, zero tracing infrastructure required.
  * *Cons*: Lacks visualization tools and dependency mapping.
* **Production Example**: Distributed tracing setups in Uber or Netflix architectures.
* **Cross Questions**: *What standard header format is used?* The W3C Trace Context standard (`traceparent`).

#### 5. How do you design APIs that handle massive file uploads (e.g. video files > 1GB) without crashing server memory?
* **Detailed Answer**: We completely bypass application servers. The client queries the API for a **Multipart Presigned URL** from AWS S3. The client uploads file chunks directly to S3 concurrently, and S3 notifies the backend once assembly is complete.
* **Deep Explanation**: Uploading massive files directly through Node servers consumes heap memory and blocks connection threads. Presigned URLs offload network I/O from the server entirely.
* **Alternative Approach**: Multipart stream parsing (e.g. using `busboy`).
  * *Pros*: Files can be processed or scanned on the server during upload.
  * *Cons*: Consumes server bandwidth, CPU, and disk storage.
* **Production Example**: Upload pipelines in Vimeo or YouTube.
* **Cross Questions**: *How do you verify file sizes with direct-to-S3 uploads?* By configuring content-length restrictions in the S3 presigned URL policy.

#### 6. What is the difference between Monolithic, Microservices, and Serverless API architectures?
* **Detailed Answer**:
  * **Monolith**: All domains share a single deployable unit. Simple to develop and test, but difficult to scale independently.
  * **Microservices**: Independent deployable domain services. High scalability, but introduces network latency and distributed transaction complexity.
  * **Serverless**: Code run as ephemeral functions (FaaS). Automatic scaling and low idle costs, but suffers from cold starts and execution timeouts.
* **Deep Explanation**: Monoliths are suited for v1. As services grow, splitting slow domains (like PDF invoice compiles) into separate workers or microservices protects the core board API.
* **Alternative Approach**: Serverless microservices.
* **Production Example**: Netflix (microservices) vs early Basecamp (monolith).
* **Cross Questions**: *What is a cold start in serverless?* The delay required to spin up a new function container on first invocation.

#### 7. How would you handle schema migrations that require breaking changes in a high-traffic production API?
* **Detailed Answer**: We use the **Expand/Contract pattern** (Blue-Green database migrations).
  1. Add new fields as nullable.
  2. Deploy application code that reads from the old fields but writes to both.
  3. Run migration scripts in batches to copy historical data to new fields.
  4. Deploy new application code that reads strictly from the new fields.
  5. Drop the old fields once system stability is verified.
* **Deep Explanation**: This avoids table locks and ensures both old and new application versions can run concurrently during deployment.
* **Alternative Approach**: Maintenance window offline migrations.
  * *Pros*: Simple, zero risk of data discrepancies.
  * *Cons*: Requires taking the platform offline.
* **Production Example**: Zero-downtime database upgrades.
* **Cross Questions**: *How do you prevent data discrepancies during backfills?* By using transactions and check queries for each batch.

#### 8. How do you protect against Replay Attacks on stateless APIs?
* **Detailed Answer**: We enforce TLS (HTTPS) on all connections. We require clients to send a unique nonce (number used once) and timestamp header with requests. The server verifies the timestamp is within a 5-minute window and checks the nonce against a Redis cache. If the nonce is already used, the request is rejected.
* **Deep Explanation**: Replay attacks occur when an attacker intercepts a valid request and resubmits it. Timestamps and nonces prevent attackers from reusing captured requests.
* **Alternative Approach**: Short-lived sessions.
  * *Pros*: Simple, low overhead.
  * *Cons*: Vulnerable if the attacker resubmits requests within the session window.
* **Production Example**: Authentication in financial transaction APIs.
* **Cross Questions**: *What is the TTL for the Redis nonce cache?* It should match the request timestamp validity window (e.g. 5 minutes).

#### 9. How would you design an API to support real-time collaborative editing?
* **Detailed Answer**: We use WebSockets (Socket.io) to support duplex communication. Edits are sent as operational transformations (OT) or conflict-free replicated data types (CRDTs). We store edits in a temporary Redis cache and commit them to the database in background batches.
* **Deep Explanation**: This enables low-latency sync and prevents database write bottlenecks by grouping writes into single batch queries.
* **Alternative Approach**: Constant HTTP polling.
  * *Pros*: Simple REST setup.
  * *Cons*: High latency and server network load.
* **Production Example**: Collaborative editing in Google Docs or Figma.
* **Cross Questions**: *What is CRDT?* A data structure that merges concurrent edits automatically without requiring central server arbitration.

#### 10. How do you design a database connection pool strategy for serverless APIs (like AWS Lambda)?
* **Detailed Answer**: Serverless functions spin up and down dynamically, creating new connection pools on each startup, which quickly exhausts database connection limits. We configure an external connection proxy (like PgBouncer or AWS RDS Proxy) to manage connection pooling, and set the application connection limit to `1` in Lambda configurations.
* **Deep Explanation**: PgBouncer multiplexes thousands of client connections over a small pool of database sessions, protecting the database engine.
* **Alternative Approach**: Monolithic deployments on virtual servers.
  * *Pros*: Simple connection management.
  * *Cons*: Lacks the automatic scaling capabilities of serverless.
* **Production Example**: Running serverless APIs on AWS Lambda with RDS Proxy.
* **Cross Questions**: *What mode should PgBouncer be set to?* Transaction mode, which releases connections back to the pool as soon as each transaction completes.

#### 11. What is an API SLA, and how do you monitor it?
* **Answer**: Service Level Agreement. A commitment to clients regarding service performance (e.g. 99.9% uptime, API latency < 200ms). We monitor this using APM tools (like Datadog or New Relic) to track error rates and response times.
* **Why Interviewer Asks**: Essential for enterprise SaaS architectures.
* **Common Mistakes**: Relying on manual tests to verify SLA compliance.
* **Follow-up**: *What is the difference between SLA and SLO?* SLO (Service Level Objective) is the target metric. SLA is the legal agreement that defines consequences if the target is missed.
* **Production Example**: Monitoring Latency percentiles ($p95$, $p99$) on API gateways.

#### 12. How do you handle database failover without dropping active API requests?
* **Answer**: We configure the application database client with a connection pool that supports multi-host failover URLs. If the primary database fails, the client automatically retries failed queries on the promoted standby instance. We implement retry policies with exponential backoff to handle transient connection drops.
* **Why Interviewer Asks**: Tests failover resilience.
* **Common Mistakes**: Crashing the server process on database connection drops.
* **Follow-up**: *What parameter enables this in PostgreSQL connection strings?* `target_session_attrs=read-write`.
* **Production Example**: Highly available PostgreSQL configurations.

#### 13. How do you design an API to support webhooks for third-party integrations?
* **Answer**: We create a `WebhookSubscription` table mapping user events to destination URLs. When an event occurs, the server sends a `POST` request to the destination URL. We sign the webhook payload using a secret key (HMAC-SHA256) and send the signature in a header, allowing clients to verify the request authenticity.
* **Why Interviewer Asks**: Explains standard integration design patterns.
* **Common Mistakes**: Sending webhook requests synchronously in the main request thread.
* **Follow-up**: *How do you handle delivery failures?* By using a queue to retry failed deliveries with exponential backoff up to a retry limit.
* **Production Example**: GitHub or Stripe webhook notification engines.

#### 14. What is the difference between GraphQL and REST APIs, and how do you choose?
* **Answer**: REST APIs expose fixed resource endpoints. GraphQL allows clients to request specific fields using a single query entry point, reducing payload size and network roundtrips. We choose REST for standard CRUD operations, and GraphQL when clients need to fetch complex, nested structures dynamically.
* **Why Interviewer Asks**: Tests API design paradigm selection.
* **Common Mistakes**: Recommending GraphQL for simple APIs where REST is more efficient.
* **Follow-up**: *What is a major security risk in GraphQL?* Deeply nested queries that can exhaust server resources (solved using query depth limiting).
* **Production Example**: GitHub API (which supports both REST and GraphQL).

#### 15. How do you implement rate limiting based on IP addresses securely when the server is behind a reverse proxy?
* **Answer**: Express parses the client IP from the connection socket by default. When behind a reverse proxy (like Nginx), we must configure Express to trust proxies: `app.set('trust proxy', true)`. This prompts Express to parse the client IP from the `X-Forwarded-For` header.
* **Why Interviewer Asks**: If proxy trust is disabled, the rate limiter uses the proxy's IP, blocking all users if a single user exceeds the quota.
* **Common Mistakes**: Setting rate limits based on `req.ip` without configuring `trust proxy`.
* **Follow-up**: *How can attackers exploit `X-Forwarded-For`?* By spoofing headers (prevented by configuring the proxy to overwrite incoming headers).
* **Production Example**: Nginx and Express deployments.

#### 16. What is the difference between horizontal and vertical scaling for APIs?
* **Answer**: Vertical scaling increases the resources (CPU, RAM) of a single server. Horizontal scaling adds more server instances behind a load balancer. Horizontal scaling is preferred for production because it provides high availability and scales dynamically.
* **Why Interviewer Asks**: Core system scaling concept.
* **Common Mistakes**: Assuming vertical scaling has no physical limit.
* **Follow-up**: *What is required to scale horizontally?* The application must be stateless.
* **Production Example**: Deploying API instances in Kubernetes clusters.

#### 17. How do you design a database schema and API to support audit logging?
* **Answer**: We create an `AuditLog` table with columns: `userId`, `action`, `entityId`, `oldValue`, `newValue`, and `timestamp`. We use triggers or ORM middleware to capture and write logs automatically on database modifications.
* **Why Interviewer Asks**: Tests system compliance design.
* **Common Mistakes**: Writing audit logs manually in every controller.
* **Follow-up**: *How do you optimize audit log storage?* By partitioning tables by date and moving historical records to cold storage.
* **Production Example**: Compliance audit logs in enterprise applications.

#### 18. How do you protect against XML External Entity (XXE) attacks on APIs?
* **Answer**: XXE attacks exploit vulnerabilities in XML parsers that allow loading external system files. We protect against this by disabling external entity resolution (DTD processing) in our XML parser configuration, or by using JSON instead of XML.
* **Why Interviewer Asks**: Essential security vulnerability check.
* **Common Mistakes**: Parsing untrusted XML payloads without configuring parser options.
* **Follow-up**: *What is a billion laughs attack?* A Denial of Service attack targeting XML parsers using nested entity expansion.
* **Production Example**: Secure XML parser configurations.

#### 19. How do you design APIs that handle server-sent events (SSE)?
* **Answer**: SSE enables one-way real-time communication from the server to the client over a persistent HTTP connection. The server sets headers: `Content-Type: text/event-stream` and keeps the connection open, sending updates formatted as event blocks.
* **Why Interviewer Asks**: Explains lightweight real-time communication alternatives to WebSockets.
* **Common Mistakes**: Using SSE when bidirectional real-time communication is required.
* **Follow-up**: *How does it compare to WebSockets?* SSE runs over standard HTTP, supports automatic reconnection, and is simpler to scale behind reverse proxies.
* **Production Example**: Real-time log streams or stock price feeds.

#### 20. How do you design a secure API for third-party mobile applications?
* **Answer**: Mobile applications cannot store secrets securely. We use the **OAuth 2.0 Authorization Code Flow with PKCE** to authenticate mobile clients, and issue short-lived access tokens stored securely on the device keychain.
* **Why Interviewer Asks**: Prevents secret exposure on public mobile clients.
* **Common Mistakes**: Hardcoding client secrets inside mobile application binaries.
* **Follow-up**: *Where should keys be stored on iOS?* Inside the iOS Keychain.
* **Production Example**: Mobile app login flows.

---

## 8. Resume-Based Questions

### Why did you use Express instead of NestJS or Fastify?
* **Answer**: Express is lightweight, has a massive ecosystem, is simple to configure, and is the industry standard for Node.js APIs. Fastify is faster, and NestJS provides structured OOD layouts, but Express was sufficient for TaskFlow's requirements and allowed us to build the MVP quickly.

### How did you test your API endpoints?
* **Answer**: We wrote integration tests using **Supertest** and **Jest**. Supertest boots the Express application in memory and sends mock HTTP requests to the routes, verifying response status codes, JSON payload headers, and database side-effects.

---

## 9. Code Review Questions

### Can `verifyWorkspaceRole` throw an uncaught exception?
* **Answer**: Yes, if the query fails or permissions are missing, it throws an error. We wrap controller calls in `try/catch` blocks (or use async handlers) to ensure these errors are caught and forwarded to the centralized error handler.

### Why do you return a wrapper object `data` in JSON responses?
* **Answer**: Wrapping responses in a `{ data: ... }` object prevents JSON hijacking vulnerabilities and provides a consistent structure for clients. If we return raw arrays directly, older browsers are vulnerable to script exploits that can intercept arrays.

---

## 10. Production Readiness

### Rate Limiting
* Enforce IP-based rate limiting on all API endpoints. Configure stricter limits on write endpoints (e.g. task creation) compared to read endpoints.

### API Documentation
* Document all endpoints using **Swagger/OpenAPI** specifications, detailing route parameters, request bodies, and response structures.

---

## 11. Common Mistakes

* **Application crashes on database errors**: Neglecting to catch asynchronous query errors, resulting in unhandled promise rejections.
* **Leaking sensitive stack traces**: Returning raw error stack traces to public API clients in production.
* **Missing input validation**: Assuming incoming request parameters are always valid and secure.

---

## 12. Cheat Sheet

* **Centralized Error Handler**: Must be registered after all routes in `app.ts`.
* **CORS Placement**: CORS middleware must execute before routers to support OPTIONS preflight requests.
* **Safe Updates**: Whitelist specific request body properties instead of passing `req.body` directly to database methods.

---

## 13. Mock Interview

### 1. What happens if a client closes their browser before the API response finishes?
* **Interviewer Expectations**: Knowledge of connection termination and cleanup.
* **Ideal Answer**: The server continues running the controller logic and database writes. If the request was writing to the database, the transaction completes, but the subsequent send call fails with a write pipe error, which Express handles gracefully.

### 2. Can you use compression in Express?
* **Interviewer Expectations**: Performance optimization techniques.
* **Ideal Answer**: Yes, we can use the `compression` middleware to compress JSON responses using gzip, reducing payload sizes by up to 70%.

### 3. How do you handle file uploads in microservices?
* **Interviewer Expectations**: Scalable upload architectures.
* **Ideal Answer**: Clients request a presigned upload URL from the files service, upload the file directly to S3, and notify the database service once complete.

---

## 14. Summary

1. TaskFlow's API is built using Express and TypeScript.
2. Route definitions are decoupled from controller logic.
3. Middlewares handle cross-cutting security concerns.
4. Input validation blocks malformed payloads at the route entry.
5. RBAC checks protect sensitive project actions.
6. Centralized error handling parses exceptions consistently.
7. Database operations are grouped in transactions.
8. API versions protect clients from breaking changes.
9. Response payloads are whitelisted to prevent data leaks.
10. API endpoints are fully tested using Supertest.
