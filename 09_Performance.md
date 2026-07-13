# Module 09: Performance Optimizations & Caching

---

## 1. Purpose

### Why This Module Exists
The **Performance Optimizations & Caching** module represents the speed and efficiency engine of TaskFlow. In technical interviews, particularly for Senior and Staff Engineer roles, candidates must demonstrate how they profile application latency, optimize slow queries, configure caching topologies, and design rate-limiting pipelines to handle load.

### What Problem It Solves
Un-optimized applications degrade under load:
* **Slow SQL Queries**: Full table scans on databases containing millions of records result in high CPU utilization and API timeouts.
* **Database Read Pressure**: Repetitive queries (like fetching static board metadata) overwhelm connection pools.
* **Server Overhead**: CPU-heavy tasks (like password hashing) or large payload serialization block the Node.js event loop.
* **Network Overhead**: Uncompressed HTML/JSON assets consume client bandwidth and slow down page load speeds.

Implementing database indexes, caching layers, and front-end optimizations ensures the platform remains responsive.

### How It Interacts With Other Modules
This performance layer optimizes resource utilization across modules:
* Speeds up data retrieval from the **Database Module**.
* Optimizes route execution times in the **Backend API**.
* Enhances page render performance on the **Frontend UI**.

```
[ Client Request ]
       |
       v
[ API Rate Limiter ]
       |
       v
[ Redis Cache check ] --- (Cache Hit) ---> [ Return Cached JSON ]
       |
   (Cache Miss)
       v
[ PostgreSQL (Indexed Scan) ]
       |
       +---> [ Write result to Redis with TTL ] ---> [ Return JSON ]
```

### Real-World Analogy
Think of performance optimization as managing a busy library.
* **Indexes** are the library card catalog. Without them, the librarian must walk down every single aisle (table scan) to find a book. With them, they go directly to the shelf (index scan).
* **Redis Caching** is like keeping the top 10 most popular books on the checkout counter. If a student wants a popular book, they get it instantly without walking into the stacks (database).
* **Compression** is like sending books in vacuum-sealed flat-packs: they take up less space in the delivery truck (network) and are opened (decompressed) at the destination.

---

## 2. High-Level Overview

TaskFlow implements a multi-layered optimization strategy: database-level indexing, application-level caching, rate limiting, and client-side rendering optimizations.

---

## 3. Detailed Workflow

Let us trace the cache-aside read execution flow: **A user requests the board dashboard for Project X.**

### Execution Sequence
1. **Cache Lookup**:
   * The request hits the controller `getBoardData`.
   * The backend checks the Redis cache: `GET project_board:projectId`.
2. **Cache Hit (Zero Database Queries)**:
   * If Redis returns a cached JSON string, the controller parses it and returns it to the client instantly (<2ms).
3. **Cache Miss & DB Fetch**:
   * If the key is missing in Redis, the server queries PostgreSQL.
   * The database uses indexes to resolve relation joins, returning the board data in under 15ms.
4. **Cache Populate**:
   * The controller writes the database result to Redis with a TTL (e.g. 1 hour): `SETEX project_board:projectId 3600 JSON_STRING`.
   * The data is returned to the user.
5. **Cache Invalidation on Mutation**:
   * When a user adds a task or column, the write controller deletes the Redis key: `DEL project_board:projectId`.
   * The next read request will trigger a cache miss, ensuring users read the latest updates.

---

## 4. Classes (Redis Client)

Caching utilities are managed via a centralized database connection helper.

### `RedisService` (Cache Manager)
* **Purpose**: Coordinates connection pools and executes Redis commands.
* **Responsibilities**:
  * Connects to the Redis cluster using secure environment variables.
  * Encapsulates common cache operations (get, set, delete).
  * Manages connection failures, falling back to database queries.
* **Why This Design**: Centralizing the Redis client wraps connection management, preventing connection leaks and facilitating testing.

---

## 5. Functions

### `getProjectBillingAggregates(projectId)`
* **Purpose**: Computes billing summaries using database-side aggregations.
* **Parameters**:
  * `projectId`: `string`
* **Return Value**: An aggregated object containing total hours and breakdowns.
* **Time Complexity**: $O(L)$ where $L$ is the number of logs.
* **Execution**:
  ```typescript
  const aggregates = await prisma.timeLog.aggregate({
    _sum: { durationSeconds: true },
    where: { task: { column: { board: { projectId } } } }
  });
  ```
* **Why Written This Way**: Performing aggregations on PostgreSQL utilizes indexes and avoids loading individual log rows to the server memory, reducing network and memory overhead.

---

## 6. Architecture Discussion

### Caching Topologies & Optimization Strategies
* **Cache-Aside Caching**: The application coordinates cache writes and invalidations. It is simple to implement and keeps database access overhead low.
* **Database Index Plan**: We analyze execution plans using `EXPLAIN ANALYZE` to check if queries use indexes or scan tables. We create indexes on fields commonly used in filters (like `workspaceId` on `Project`).

---

## 7. Interview Questions

### Easy (15)

#### 1. What is caching?
* **Answer**: Storing copies of data in a high-speed data storage layer (like RAM) to resolve future requests faster.
* **Explanation**: We use Redis to cache board details, avoiding slow database queries.
* **Follow-up**: *What is a major challenge in caching?* Cache invalidation: ensuring cached data stays in sync with changes in the database.
* **Common Mistakes**: Storing all database tables in cache forever.

#### 2. What is Redis?
* **Answer**: An open-source, in-memory key-value data structure store used as a database, cache, and message broker.
* **Explanation**: Because Redis stores data in RAM, read and write operations are completed in sub-milliseconds.
* **Follow-up**: *Is Redis single-threaded?* Yes, its core command execution engine runs on a single thread to prevent concurrency conflicts.
* **Common Mistakes**: Claiming Redis is a relational SQL database.

#### 3. What is a TTL (Time-To-Live) in caching?
* **Answer**: A configuration parameter that specifies the duration data remains in cache before it expires and is deleted.
* **Explanation**: We set a 1-hour TTL on board cache keys to ensure stale data is eventually refreshed.
* **Follow-up**: *What happens if the data is updated before the TTL expires?* We delete the cache key manually to force a fresh reload.
* **Common Mistakes**: Setting infinite TTLs for dynamic, frequently edited data.

#### 4. What is a query execution plan?
* **Answer**: A plan generated by the database optimizer detailing the steps it will execute to retrieve query results.
* **Explanation**: We view execution plans using `EXPLAIN ANALYZE` in PostgreSQL to optimize queries.
* **Follow-up**: *What step indicates a missing index?* `Sequential Scan` (or Seq Scan) on a large table.
* **Common Mistakes**: Creating indexes without verifying their usage in execution plans.

#### 5. What does the `EXPLAIN` command do in PostgreSQL?
* **Answer**: Displays the execution plan generated by the query planner for a statement without running it.
* **Explanation**: It lists expected cost metrics, index lookups, and scan types.
* **Follow-up**: *What is the difference between EXPLAIN and EXPLAIN ANALYZE?* EXPLAIN ANALYZE runs the query, returning actual execution times alongside estimates.
* **Common Mistakes**: Running EXPLAIN ANALYZE on write queries (`INSERT` or `DELETE`) in production (it executes modifications).

#### 6. Why is gzip compression useful for APIs?
* **Answer**: It compresses JSON payloads before transmission over the network, reducing bandwidth usage and page load times.
* **Explanation**: We enable gzip using compression middleware on our Express server.
* **Follow-up**: *What header specifies compression?* `Content-Encoding: gzip`.
* **Common Mistakes**: Compiling very small payloads, which can increase sizes due to compression headers overhead.

#### 7. What is the difference between `React.memo` and `useMemo`?
* **Answer**: `React.memo` is a higher-order component that memoizes rendering outputs of components. `useMemo` is a hook that memoizes computed values inside components.
* **Explanation**: We wrap card components in `React.memo`, and use `useMemo` to filter lists.
* **Follow-up**: *When does useMemo run?* During component rendering cycles.
* **Common Mistakes**: Using `useMemo` to cache simple calculations (like additions), which adds overhead.

#### 8. What is connection pooling?
* **Answer**: A cache of database connections maintained by the application, allowing connections to be reused instead of created on demand.
* **Explanation**: Creating connections is expensive. Pools keep active connections open for reuse.
* **Follow-up**: *What happens if the pool is full?* Incoming queries wait in a queue until a connection becomes available.
* **Common Mistakes**: Allocating massive connection pools, which exhausts database server memory.

#### 9. What is a CDN (Content Delivery Network)?
* **Answer**: A network of distributed servers that cache static assets (like JS, CSS, images) close to users to speed up access.
* **Explanation**: We host our React build folder on a CDN to minimize page load times globally.
* **Follow-up**: *Does a CDN cache API JSON responses?* Typically no, API requests are dynamic and routed to application origin servers.
* **Common Mistakes**: Pointing CDNs to dynamic login endpoints.

#### 10. Why is `Math.random()` bad for generating security keys?
* **Answer**: It is a pseudo-random generator that can generate predictable patterns, making keys vulnerable to brute-force attacks.
* **Explanation**: We use Node's `crypto` module to generate secure keys.
* **Follow-up**: *What is it based on?* Cryptographically secure entropy sources in the host OS kernel.
* **Common Mistakes**: Using `Math.random()` to generate password reset tokens.

#### 11. What is the role of index selectivity?
* **Answer**: The ratio of unique values in a column to the total row count. High selectivity columns (like email) make indexes highly effective.
* **Explanation**: Low selectivity columns (like status enums) make indexes ineffective, causing the database to perform table scans.
* **Follow-up**: *Can you index low selectivity columns?* Yes, but the database planner will often ignore the index.
* **Common Mistakes**: Creating indexes on boolean flags (like `isDone`).

#### 12. What is cache invalidation?
* **Answer**: The process of deleting or updating cached data when the source database records are modified.
* **Explanation**: When a task is updated, we delete its board cache key to prevent users from reading stale data.
* **Follow-up**: *What is the hardest part of invalidation?* Ensuring all related cache keys are cleared consistently.
* **Common Mistakes**: Relying only on TTLs for invalidation, which leaves stale data active in the cache.

#### 13. What is latency?
* **Answer**: The time delay between a client action and the server response, usually measured in milliseconds.
* **Explanation**: We optimize database queries and caching to minimize API latency.
* **Follow-up**: *What is throughput?* The number of requests the server can process concurrently within a time window.
* **Common Mistakes**: Conflating latency and throughput as the same metric.

#### 14. Why do we run database vacuuming?
* **Answer**: To clean up dead row versions created by updates and deletes in PostgreSQL's MVCC engine, reclaiming storage space.
* **Explanation**: PostgreSQL keeps old row versions active until vacuumed, which can bloat tables.
* **Follow-up**: *What is autovacuum?* A background daemon that runs vacuum operations automatically.
* **Common Mistakes**: Disabling autovacuum on write-heavy databases.

#### 15. What is the benefit of database-side aggregations?
* **Answer**: It utilizes database indexes and reduces network payload sizes by returning summary aggregates instead of raw rows.
* **Explanation**: Running `SUM` in PostgreSQL is faster than fetching rows and looping in Node.js.
* **Follow-up**: *What aggregate function did we use?* `_sum` inside Prisma queries.
* **Common Mistakes**: Fetching full tables to compute sums in application memory.

---

### Medium (20)

#### 1. Explain the Cache-Aside pattern, and how you manage cache invalidation in TaskFlow.
* **Interviewer's Intent**: To check caching strategy design skills and consistency management practices.
* **Answer**: In the Cache-Aside pattern, the application manages the cache.
  * *Read Path*: Check Redis for the key. On cache hit, return data. On cache miss, fetch from PostgreSQL, write to Redis with a TTL, and return.
  * *Write Path*: Update the database first, then delete the related Redis cache key (`DEL project_board:projectId`).
* **Why Interviewer Asks**: Failing to clear the cache during writes leaves users reading outdated state data.
* **Common Mistakes**: Updating the cache payload directly inside the write controller, which can introduce race conditions if concurrent writes overwrite each other.
* **Follow-up**: *What is the advantage of deleting the key over updating it?* Deleting is simple and avoids race conditions, as the next read will fetch the latest database state.
* **Production Example**: Caching structures in collaborative boards.

#### 2. What is Cache Stampede (or Thundering Herd), and how do you protect against it?
* **Interviewer's Intent**: To test advanced caching safety design under high traffic.
* **Answer**: A cache stampede occurs when a popular cache key expires under high concurrent traffic. Multiple server threads detect the cache miss and query the database simultaneously, overwhelming the database engine. We protect against this using **Mutual Exclusion (Mutex) locking**. When a cache miss occurs, the first request acquires a lock to query the database, while other requests wait or read stale data until the cache is updated.
* **Why Interviewer Asks**: High-traffic platforms can experience database crashes during cache expiries if protection is missing.
* **Common Mistakes**: Setting identical expiries for all cache keys without jitter (adding random offsets to TTLs).
* **Follow-up**: *How does Jitter help?* Adding random offsets to TTLs prevents multiple keys from expiring at the exact same moment.
* **Production Example**: High-volume product catalog caching.

#### 3. How does index column order affect composite indexes?
* **Interviewer's Intent**: To check index structure design skills and query plan optimization.
* **Answer**: A composite index is sorted by the first column first, then the second. The database can only utilize the index if the query filters by the leftmost prefix. An index on `(columnId, priority)` optimizes queries filtering by `columnId` or `(columnId, priority)`, but is ignored if the query filters only by `priority`.
* **Why Interviewer Asks**: Creating composite indexes in the wrong order wastes storage and fails to optimize queries.
* **Common Mistakes**: Assuming an index on `(A, B)` automatically optimizes queries filtering only by `B`.
* **Follow-up**: *What index is required if you filter only by priority?* A separate index on `priority`.
* **Production Example**: Creating indexes on junction tables like `WorkspaceMember(workspaceId, userId)`.

#### 4. How do you implement API rate limiting in Express using Redis sliding windows?
* **Interviewer's Intent**: To verify knowledge of rate limiting algorithms and Redis transaction structures.
* **Answer**: We use the **Sliding Window Log** algorithm stored in Redis.
  1. For each request, we write a timestamp to a sorted set keyed by the user's identifier: `ZADD rate_limit:user_id timestamp timestamp`.
  2. Remove timestamps older than the window limit: `ZREMRANGEBYSCORE rate_limit:user_id 0 (now - window)`.
  3. Fetch the size of the set: `ZCARD rate_limit:user_id`.
  4. If the size is within the quota, allow the request; otherwise, reject it.
* **Why Interviewer Asks**: Simple fixed-window limiters are vulnerable to traffic spikes at window resets. Sliding windows smooth out rates.
* **Common Mistakes**: Implementing rate limiters using local server memory maps, which does not scale across instances.
* **Follow-up**: *How do you run these commands efficiently?* Using a Redis transaction (`MULTI`/`EXEC`) or Lua script to run them atomically.
* **Production Example**: API rate limiting in gateways.

#### 5. What are the performance trade-offs of using Prisma Client vs Raw SQL queries?
* **Interviewer's Intent**: To check developer productivity vs query optimization trade-offs.
* **Answer**: 
  * *Prisma*: Highly productive, type-safe, prevents syntax errors, and handles relation joins automatically. However, it can generate complex, un-optimized SQL queries for nested relations.
  * *Raw SQL*: Direct control over execution plans, optimized index lookups, and minimal overhead. However, it lacks compile-time type safety and is error-prone.
* **Why Interviewer Asks**: Senior engineers must select the right tool based on performance requirements instead of relying strictly on ORMs.
* **Common Mistakes**: Using Prisma for complex data migrations where raw SQL batch queries are faster.
* **Follow-up**: *How do you execute raw queries in Prisma?* Using `prisma.$queryRaw`.
* **Production Example**: Aggregations in billing controllers.

#### 6. What is a N+1 query problem, and how do you resolve it?
* **Answer**: A performance bottleneck where the application runs one query to fetch parent records (N), and then runs separate queries for each parent to fetch child records (+1). We resolve this by using eager loading (joining tables) to fetch all records in a single query.
* **Why Interviewer Asks**: Classic ORM performance bottleneck.
* **Common Mistakes**: Iterating over tasks in code and querying the database to fetch comments for each task.
* **Follow-up**: *How does Prisma prevent this?* By using the `include` option to join relations in SQL.
* **Production Example**: Fetching tasks and assignees in board queries.

#### 7. How does the browser's Garbage Collector interact with React virtual DOM reconciliation?
* **Answer**: React creates and destroys lightweight JavaScript objects representing virtual DOM nodes. If components re-render frequently, this creates garbage, triggering frequent garbage collection cycles that cause UI stutter. We optimize this by memoizing components and avoiding declaring objects inside rendering loops.
* **Why Interviewer Asks**: Explains UI performance degradation on high-interaction pages.
* **Common Mistakes**: Declaring static arrays or styling objects directly inside rendering components.
* **Follow-up**: *How do you prevent this?* Move static declarations outside the component definition.
* **Production Example**: Render optimization in task lists.

#### 8. What is the difference between Redis Cache-Aside and Write-Through caching?
* **Answer**: Cache-Aside requires the application to load data on cache misses and invalidate keys on writes. Write-Through automatically writes changes to both the cache and database in a single transaction, keeping the cache always warm.
* **Why Interviewer Asks**: Tests caching strategy selection.
* **Common Mistakes**: Using Write-Through for tables with low read-to-write ratios.
* **Follow-up**: *Which is simpler?* Cache-Aside, as it decouples cache logic from core database writes.
* **Production Example**: Caching architectures.

#### 9. Why do we use relative index paths (float numbers) for card ordering?
* **Answer**: Integer reordering requires shifting indices (e.g. `order = order + 1`) for all subsequent cards on drag-and-drop, generating multiple database writes. Using floats allows calculating a value between the adjacent cards, requiring only 1 row update.
* **Why Interviewer Asks**: Tests database write optimization.
* **Common Mistakes**: Writing loop update queries in code to reorder task rows.
* **Follow-up**: *When do you re-normalize float indices?* In background jobs when floating-point precision limits are reached.
* **Production Example**: Sorting algorithms in Jira or Trello.

#### 10. How do you optimize static asset delivery in React apps?
* **Answer**: 
  1. Compress files using Brotli or gzip.
  2. Implement code splitting to chunk bundles.
  3. Deploy static assets close to users using CDNs.
  4. Configure long-term cache headers (`Cache-Control: max-age=31536000`).
* **Why Interviewer Asks**: Essential front-end performance practice.
* **Common Mistakes**: Serving un-minified assets directly from the Node API server.
* **Follow-up**: *How does Vite handle versioning?* By appending content hashes to filenames (e.g. `index.hash.js`).
* **Production Example**: Frontend build configurations.

#### 11. What is the impact of table partition pruning on PostgreSQL query speeds?
* **Answer**: Partition pruning allows the query planner to analyze the query filters and scan only the partition tables that match the criteria, ignoring all other partitions and speeding up data retrieval.
* **Why Interviewer Asks**: Explains database optimizations for massive tables.
* **Common Mistakes**: Creating partitions on columns that are not used in filters, which prevents pruning.
* **Follow-up**: *What tables benefit from this?* Logs and transactional histories.
* **Production Example**: Partitioning activity logs.

#### 12. How does HTTP keep-alive improve API connection performance?
* **Answer**: It allows reusing a single TCP connection to send and receive multiple HTTP requests/responses, avoiding the overhead of establishing a new connection for every call.
* **Why Interviewer Asks**: Explains network layer optimizations.
* **Common Mistakes**: Disabling keep-alive on internal microservice connections.
* **Follow-up**: *What protocol enables this by default?* HTTP/1.1 and HTTP/2.
* **Production Example**: Connection configurations in load balancers.

#### 13. What is the difference between CPU-bound and I/O-bound tasks in Node.js?
* **Answer**: CPU-bound tasks consume CPU cycles (like bcrypt hashing or JSON parsing). I/O-bound tasks wait for external resources (like database queries or file reads). Node.js handles I/O-bound tasks efficiently due to its non-blocking event loop.
* **Why Interviewer Asks**: Explains Node.js runtime performance constraints.
* **Common Mistakes**: Running CPU-bound tasks in the main request thread under high traffic.
* **Follow-up**: *How do you scale CPU-bound tasks?* By offloading them to worker threads or background worker queues.
* **Production Example**: Offloading PDF generation to worker processes.

#### 14. How does Nginx reverse proxy buffering protect Node.js servers?
* **Answer**: Nginx buffers slow client request payloads and only forwards them to the Node server once fully received, protecting Node's single-threaded event loop from slow connection overhead.
* **Why Interviewer Asks**: Prevent slowloris and resource consumption exploits.
* **Common Mistakes**: Exposing Node API servers directly to the public internet without a reverse proxy.
* **Follow-up**: *What is this buffering called?* Request buffering.
* **Production Example**: Nginx and Express deployments.

#### 15. What are the benefits of caching JWT validation outcomes in memory?
* **Answer**: Validating JWT signatures is a CPU-bound mathematical check. Caching verified token IDs (`jti`) in a local memory cache (like LRU cache) avoids signature calculations on subsequent requests, improving API throughput.
* **Why Interviewer Asks**: Tests CPU optimization methods.
* **Common Mistakes**: Caching tokens without expiration tracking.
* **Follow-up**: *What is the risk?* Revoked tokens remain active until the memory cache expires.
* **Production Example**: Optimizing auth middlewares.

#### 16. How do you implement query debouncing on the client?
* **Answer**: By delaying the execution of a function until a user stops typing for a specific duration (e.g. 300ms), avoiding spamming the backend with API requests.
* **Why Interviewer Asks**: Essential search input optimization.
* **Common Mistakes**: Triggering search API requests on every single keystroke.
* **Follow-up**: *What hook did we use?* Custom debounce hooks or library functions (like Lodash).
* **Production Example**: Search filters in dashboards.

#### 17. How do you optimize database index sizes in PostgreSQL?
* **Answer**: By creating partial indexes (indexing only rows that match a WHERE clause) and avoiding creating indexes on low-selectivity columns.
* **Why Interviewer Asks**: Large indexes consume memory and slow down write operations.
* **Common Mistakes**: Creating indexes on all table columns.
* **Follow-up**: *How do you write a partial index query?* `CREATE INDEX idx on table(col) WHERE active = true;`.
* **Production Example**: Task indexes configurations.

#### 18. What is the difference between memory leaks and high memory usage?
* **Answer**: Memory leaks are allocations that are no longer needed but are not reclaimed by the garbage collector, causing memory consumption to grow indefinitely. High memory usage is temporary, representing active allocations required by the application.
* **Why Interviewer Asks**: Explains debugging analysis.
* **Common Mistakes**: Assuming high memory usage during peak traffic is always a memory leak.
* **Follow-up**: *What tool detects leaks?* Node heap snapshot profiling.
* **Production Example**: Debugging stopwatch interval leaks.

#### 19. How do you configure Brotli compression, and how does it compare to Gzip?
* **Answer**: Brotli is a compression algorithm developed by Google that offers 15-20% better compression ratios than Gzip, particularly for text files (like JS/CSS). We configure it on Nginx or CDNs.
* **Why Interviewer Asks**: Advanced payload compression check.
* **Common Mistakes**: Compiling Brotli dynamically on the Node server, which consumes more CPU than Gzip.
* **Follow-up**: *What header specifies Brotli?* `Content-Encoding: br`.
* **Production Example**: Static asset compression.

#### 20. How do you design an API to support client-side caching using HTTP headers?
* **Answer**: By setting headers like `ETag` (unique content hash) and `Cache-Control: private, max-age=X`. The browser checks the ETag; if the content has not changed, it returns `304 Not Modified` without transferring data.
* **Why Interviewer Asks**: Explains native browser caching models.
* **Common Mistakes**: Setting cache headers on dynamic POST requests.
* **Follow-up**: *What does max-age do?* Specifies the duration the browser can serve cached data without verifying it.
* **Production Example**: Serving static images or workspace settings.

---

### Hard (20)

#### 1. How would you design a distributed cache invalidation system using Redis Pub/Sub to coordinate memory caches across 10 API server instances?
* **Detailed Answer**: To minimize Redis query overhead, each API instance maintains a local in-memory cache (like an LRU cache) for project settings.
  1. Read: The API instance checks its local memory first. If missing, it queries Redis, then PostgreSQL, and caches the result locally.
  2. Write: The API updates PostgreSQL, deletes the Redis key, and publishes an invalidation event to a Redis Pub/Sub channel: `PUBLISH cache_invalidation project_id`.
  3. Coordination: All 10 API instances subscribe to the channel. Upon receiving the event, they delete the key from their local memory cache, ensuring consistency across all instances within 10ms.
* **Deep Explanation**: This hybrid approach (L1 local cache, L2 Redis cache) minimizes network roundtrips to Redis, improving throughput for static data.
* **Alternative Approach**: Centralized Redis queries only.
  * *Pros*: Simple, zero Pub/Sub coordination code.
  * *Cons*: High Redis network load under peak traffic.
* **Production Example**: Caching configurations in large SaaS clusters.
* **Cross Questions**: *What if a subscriber disconnects and misses an invalidation event?* We configure short local memory cache expiries (e.g. 5 minutes) to ensure instances eventually sync.

#### 2. How do you optimize a PostgreSQL query that joins 6 tables and executes in over 2 seconds under production loads?
* **Detailed Answer**:
  1. Run `EXPLAIN (ANALYZE, BUFFERS)` to trace execution cost, heap accesses, and scan types.
  2. Create composite indexes on foreign keys to eliminate table scans (e.g. `idx_task_col` on `Task(columnId, id)`).
  3. Rewrite the query to filter rows *before* joining, or replace deep joins with targeted parallel queries.
  4. Configure PostgreSQL parameters (like `work_mem`) to allow sorting operations in RAM rather than temporary files on disk.
* **Deep Explanation**: Query engines fail to plan optimizations when joining too many tables, defaulting to nested loops and disk writes. Parallel queries combined with application-side mapping can outperform complex joins.
* **Alternative Approach**: Creating a materialized view that updates periodically.
  * *Pros*: Reading the view is fast (<5ms), as it operates as a single table.
  * *Cons*: Displays stale data until the view is refreshed.
* **Production Example**: Optimization in dashboard statistics reporting.
* **Cross Questions**: *What is index-only scan?* An optimization where the database retrieves columns directly from the index tree without loading table heap pages.

#### 3. How do you design and implement a sliding-window rate limiter that handles 100,000 requests per second across a global API network?
* **Detailed Answer**: At this scale, processing rate limiting inside application code blocks degrades performance. We move rate limiting to the edge network (e.g., Cloudflare Workers) or API gateway layer (e.g. Kong). We use the Token Bucket algorithm stored in a globally distributed Redis cache.
* **Deep Explanation**: Edge rate limiting stops malicious requests at CDN POPs (Points of Presence) before they consume bandwidth or hit application servers.
* **Alternative Approach**: App-level rate limiting using in-memory maps.
  * *Pros*: Zero external infrastructure dependency.
  * *Cons*: Exhausts server RAM and doesn't scale across multiple instances.
* **Production Example**: Edge rate limiting in platforms like GitHub or Shopify.
* **Cross Questions**: *How do you handle Redis connection drops in edge rate limiters?* We configure fail-open policies, allowing requests if Redis is unreachable, to preserve availability.

#### 4. How would you design a database archiving strategy to keep primary database size under 100GB?
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

#### 5. How do you resolve memory leaks in Node.js applications?
* **Detailed Answer**:
  1. Run the Node process with the `--inspect` flag to enable debugging.
  2. Use Chrome DevTools or CLI tools to take heap snapshots under varying loads.
  3. Compare snapshots using heap diffing to identify objects that are not collected.
  4. Common leaks include active intervals without cleanup, event listeners on global objects, or caching objects in global arrays.
* **Deep Explanation**: Memory leaks cause memory utilization to grow, eventually triggering out-of-memory crashes.
* **Alternative Approach**: Restarting processes automatically using PM2 alerts.
  * *Pros*: Simple, keeps the application running.
  * *Cons*: Masks the root problem, which will continue to degrade performance under load.
* **Production Example**: Debugging stopwatch memory leaks.
* **Cross Questions**: *How does the V8 garbage collector reclaim memory?* Using generational garbage collection (Scavenge for young objects, Mark-Sweep-Compact for old objects).

#### 6. What is the difference between a table scan and an index scan?
* **Answer**: A table scan reads every page of a database table to find matching rows. An index scan queries the index tree (B-Tree) to locate matching rows directly.
* **Why Interviewer Asks**: Basic database optimization concept.
* **Common Mistakes**: Assuming the database optimizer always uses indexes.
* **Follow-up**: *When will the database perform a table scan even if an index exists?* If the table is small, as loading index pages can add more overhead than reading the table directly.
* **Production Example**: Optimizing query lookups.

#### 7. How does the choice of JSON serialization format affect network performance?
* **Answer**: JSON is text-based and verbose. Replacing JSON with binary serialization formats (like MessagePack or Protocol Buffers) reduces payload sizes by up to 50% and improves serialization speeds, saving bandwidth and CPU.
* **Why Interviewer Asks**: Advanced serialization optimization check.
* **Common Mistakes**: Assuming JSON is the only data format supported by WebSockets.
* **Follow-up**: *What is the drawback?* Binary payloads cannot be read directly in browser network panels.
* **Production Example**: Low-latency WebSocket communication in mobile gaming or financial applications.

#### 8. How do you configure a Redis cluster for high availability?
* **Answer**: We set up a Redis cluster with master-replica replication and sentinel nodes. Sentinels monitor nodes; if a master node fails, they automatically promote a replica to master and notify application clients.
* **Why Interviewer Asks**: Tests infrastructure safety design.
* **Common Mistakes**: Deploying a single Redis instance without replicas in production.
* **Follow-up**: *What is Redis sharding?* Distributing keys across multiple Redis master nodes to scale storage capacity.
* **Production Example**: Production Redis configurations.

#### 9. How do you implement load balancing on database connection pools?
* **Answer**: By configuring connection pools with separate write and read database URLs. Write queries are routed to the primary database, while read queries are load-balanced across multiple read replicas.
* **Why Interviewer Asks**: Explains read-scaling architectures.
* **Common Mistakes**: Routing all queries to the primary database, wasting replica capacity.
* **Follow-up**: *How do you handle replica lag?* Route critical reads to the primary database for a short window after write mutations.
* **Production Example**: Scaling Prisma database connections.

#### 10. Why is V8 engine optimization important for Node.js developers?
* **Answer**: V8 compiles JavaScript directly to native machine code. Understanding V8 optimizations (like hidden classes and inline caching) helps developers write code that compiles faster and runs efficiently.
* **Why Interviewer Asks**: Tests deep runtime engine understanding.
* **Common Mistakes**: Believing V8 is a simple interpreter.
* **Follow-up**: *What compiler optimization did we utilize?* Keeping object shapes consistent to allow inline caching optimizations.
* **Production Example**: Writing high-performance utilities.

#### 11. What is the impact of CSS backdrop filters on rendering performance?
* **Answer**: Backdrop filters are GPU-intensive because they require the browser to read pixels behind an element, apply a blur filter, and render the element. Using multiple large blur filters can cause frame drops, especially on mobile devices or devices with low-spec GPUs.
* **Why Interviewer Asks**: Explains UI design performance trade-offs.
* **Common Mistakes**: Applying massive blur filters (`backdrop-filter: blur(100px)`) to scrolling list containers.
* **Follow-up**: *How do you optimize this?* Use simple solid fallbacks for low-power devices, or apply filters only to static top-level containers.
* **Production Example**: Sleek glassmorphism dashboards.

#### 12. How do you optimize image load times on Web Dashboards?
* **Answer**: 
  1. Compress and convert images to modern formats (like WebP).
  2. Implement lazy loading (`loading="lazy"`).
  3. Use responsive image widths (`srcset`).
  4. Cache static assets using CDNs.
* **Why Interviewer Asks**: Images are the largest contributors to page load sizes.
* **Common Mistakes**: Loading raw high-resolution PNG files directly on dashboard cards.
* **Follow-up**: *What tool did we use for user avatars?* Gravatar URL generations or optimized cloud avatar formats.
* **Production Example**: Avatar render components.

#### 13. What is the difference between `React.lazy` and dynamic imports?
* **Answer**: Dynamic import is a JavaScript feature that loads files asynchronously. `React.lazy` is a React utility that wraps dynamic imports, allowing components to be rendered dynamically with fallback loaders.
* **Why Interviewer Asks**: Code splitting configuration patterns.
* **Common Mistakes**: Calling `React.lazy` inside render functions (it must be defined at the module level).
* **Follow-up**: *Which component provides the loading fallback?* `<Suspense fallback={<Loader />} >`.
* **Production Example**: Lazy loading the billing page chunk.

#### 14. What are React synthetic events?
* **Answer**: A wrapper around browser-native events that standardizes event properties across different browsers, optimizing performance using event delegation (attaching listeners to the document root instead of individual nodes).
* **Why Interviewer Asks**: Clarifies React event system internals.
* **Common Mistakes**: Thinking React binds event listeners to individual DOM elements directly.
* **Follow-up**: *How do you access native events?* Via `event.nativeEvent`.
* **Production Example**: Click handlers on board cards.

#### 15. How do you design components to support internationalization (i18n)?
* **Answer**: We use translation libraries (like `react-i18n`). We define translation JSON files for target languages, map UI text to key markers (e.g. `t('board.create')`), and toggle translation contexts dynamically.
* **Why Interviewer Asks**: Tests internationalization scalability.
* **Common Mistakes**: Hardcoding UI text in multiple languages directly inside components.
* **Follow-up**: *Where are translations stored?* In JSON files loaded on demand.
* **Production Example**: Language switchers in dashboards.

#### 16. What is the difference between a React component mount and render?
* **Answer**: Render is the execution of the component function to calculate virtual DOM updates. Mount is the physical insertion of the resulting DOM nodes into the browser document.
* **Why Interviewer Asks**: Clarifies component lifecycle states.
* **Common Mistakes**: Believing components mount on every state update.
* **Follow-up**: *Which hook runs after mount?* `useEffect` with an empty dependency array.
* **Production Example**: Initial page renders.

#### 17. How do you implement client-side session auto-logout?
* **Answer**: By tracking user activity (listens to mouse clicks, keypresses) using event listeners. If no events occur within a timeout threshold, we clear local tokens and redirect the user to the login screen.
* **Why Interviewer Asks**: Critical security compliance feature.
* **Common Mistakes**: Running tracking timers inside rendering loops without cleanup, leading to memory leaks.
* **Follow-up**: *How do you reset the idle timer?* By resetting a setTimeout callback on user interaction events.
* **Production Example**: Auto-logout in banking dashboards.

#### 18. What is the purpose of the `dnd-kit` SortableContext `strategy` prop?
* **Answer**: It defines the coordinate calculation model used to reorder list items (e.g. vertical list strategy, horizontal list strategy, grid strategy).
* **Why Interviewer Asks**: Tests drag sorting optimization.
* **Common Mistakes**: Using vertical strategy for grid-based board canvases, which corrupts layout shifts during drag actions.
* **Follow-up**: *Which strategy did we use for Kanban columns?* `horizontalListSortingStrategy`.
* **Production Example**: Reordering columns.

#### 19. How do you optimize React applications for screen readers and accessibility (a11y)?
* **Answer**: 
  1. Use semantic HTML elements (button, nav, main).
  2. Define `aria-label` properties on icon-only buttons.
  3. Ensure all interactive components are keyboard navigable.
  4. Configure skip-link tags to bypass navigation headers.
* **Why Interviewer Asks**: Essential compliance requirement.
* **Common Mistakes**: Using un-styled `div` elements with click handlers instead of native `button` elements.
* **Follow-up**: *How does dnd-kit support this?* It has built-in screen reader announcements for drag actions.
* **Production Example**: Custom keyboard inputs in dashboards.

#### 20. What is client-side state hydration, and when is it used?
* **Answer**: The process of reading cached state data from local storage or cookie objects during client startup to populate the initial state structure before making API queries.
* **Why Interviewer Asks**: Tests offline support and cache warming.
* **Common Mistakes**: Hydrating stale data without executing background verification checks.
* **Follow-up**: *How did we use it?* For restoring active stopwatch states.
* **Production Example**: Retaining timer runs across page refreshes.

---

## 8. Resume-Based Questions

### Why did you select Redis for caching instead of Memcached?
* **Answer**: Redis supports rich data structures (like sorted sets, lists, hashes) which are critical for sliding window rate limiting and task queues. Memcached only supports simple strings, which would limit our infrastructure options.

### How did you test performance limits in your application?
* **Answer**: We use load testing tools (like autocannon or k6) to simulate concurrent users making requests to our endpoints, monitoring API latencies, error counts, and database CPU levels under load.

---

## 9. Code Review Questions

### Why did you create an index on `Task(columnId)`?
* **Answer**: When loading boards, we query tasks by `columnId`. Creating this index enables the database to execute fast index scans instead of walking the entire `Task` table, improving page render speeds.

### Can Redis connection drops crash the Express server?
* **Answer**: No, we wrap Redis commands in `try/catch` blocks and listen to connection events on the client, falling back to direct database queries if Redis goes offline to maintain platform availability.

---

## 10. Production Readiness

### Monitoring Alerts
* Configure Datadog or Prometheus alerts to notify the team if API latency ($p99$) exceeds 300ms or database CPU exceeds 80%.

### Cache Pruning
* Configure Redis memory eviction policies to `allkeys-lru` (Least Recently Used) to prevent memory exhaustion by reclaiming storage space automatically.

---

## 11. Common Mistakes

* **Application-Side Joins**: Loading multiple tables to application memory to perform joins in JavaScript, degrading server performance.
* **Missing Indexing checks**: Creating indexes without validating their usage via `EXPLAIN ANALYZE` commands.
* **Infinite TTLs**: Caching frequently modified data with infinite expiries.

---

## 12. Cheat Sheet

* **Cache-Aside Pattern**: Read Redis -> DB fetch on miss -> set cache. Delete cache on write.
* **PostgreSQL indexing**: Always index foreign keys used in joins and queries.
* **Node.js Loop safety**: Avoid executing CPU-heavy loops in the main event thread.

---

## 13. Mock Interview

### 1. What happens if the database connection pool size is too small?
* **Interviewer Expectations**: Resource queuing awareness.
* **Ideal Answer**: Queries wait in a queue, increasing API latency. If the queue grows too large, requests time out and fail with connection errors.

### 2. Can you index a text field in PostgreSQL?
* **Interviewer Expectations**: Full-text index knowledge.
* **Ideal Answer**: Yes, we use a **GIN (Generalized Inverted Index)** index on a `tsvector` representation of the text column to optimize search queries.

### 3. How do you optimize WebSocket network traffic?
* **Interviewer Expectations**: WebSockets optimization.
* **Ideal Answer**: By debouncing updates on the client, compressing payloads, and only broadcasting modifications instead of full records.

---

## 14. Summary

1. TaskFlow implements caching, indexing, and rendering optimizations.
2. PostgreSQL indexes on foreign keys prevent slow table scans.
3. Redis Cache-Aside layer caches project boards to reduce read pressure.
4. Active mutations delete cached keys to prevent stale reads.
5. EXPLAIN plans verify query optimization health.
6. Centralized Redis clients handle connection drops gracefully.
7. Database-side aggregations minimize payload sizes.
8. Front-end code splitting reduces initial page load sizes.
9. Sliding-window rate limiters prevent API spamming.
10. System capacities are monitored using metrics alerts.
