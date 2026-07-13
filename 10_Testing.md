# Module 10: Testing Frameworks

---

## 1. Purpose

### Why This Module Exists
The **Testing Frameworks** module represents the quality control gate of TaskFlow. In professional engineering interviews, candidates are judged on their testing philosophy. Hiring managers look for engineers who write highly isolated, deterministic tests that verify security boundaries, database constraints, input validations, and integration state changes under multi-user concurrency.

### What Problem It Solves
Without a robust, automated test suite:
* **Regressions**: Adding a feature (like billing logs) can break unrelated routes (like authorization checks).
* **Flaky tests**: Tests that randomly pass or fail due to shared global states or network dependencies.
* **Security leaks**: Unverified endpoints can expose private company data if role authorizations are bypassed.

Implementing segregated unit tests, mocking external network interfaces, and running integration tests against isolated test databases guarantees application stability.

### How It Interacts With Other Modules
The testing framework exercises all codebase layers:
* Validates schema boundaries in the **Database Module**.
* Verifies route handlers and controller logic in the **Backend API**.
* Tests session exchanges engineered in the **Authentication Module**.

```
[ Jest Test Runner ]
         |
         +---> [ Mock External Services ] (e.g. Google OAuth APIs)
         |
         +---> [ Supertest Request Simulator ]
         |             |
         |             v
         |     [ Express Router / Controllers ]
         |             |
         |             v
         +---> [ PostgreSQL Test Database ] (Isolated instance)
                       |
               [ Cascade Teardown ]
```

### Real-World Analogy
Think of the testing framework as a vehicle manufacturing crash-test facility.
* **Unit tests** are component diagnostics: testing the seatbelt tensioner (a single utility function) or the brake pad caliper (a validator) in isolation.
* **Integration tests** represent driving the completed car on a closed track. We accelerate, brake, turn, and crash it under controlled conditions, checking that the chassis (database) and engine (controllers) work together safely.
* **Mocking** is like using a crash-test dummy. Instead of risking a real human (making live calls to Google OAuth servers), we use a calibrated replica that simulates the exact outputs we expect.

---

## 2. High-Level Overview

TaskFlow uses Jest as its primary test runner, paired with Supertest for API integration testing and Prisma client configurations for database state validations.

---

## 3. Detailed Workflow

Let us trace the integration testing of the 2FA login verification: **`POST /api/v1/auth/verify-2fa`**.

### Execution Sequence
1. **Environment Setup**:
   * Jest boots the test suite, setting environment parameters to point to an isolated local PostgreSQL test database: `DATABASE_URL="postgresql://test:test@localhost:5432/taskflow_test"`.
   * It runs migrations to build the schema from scratch.
2. **User Seed**:
   * The test seeds a test user with `twoFactorEnabled: true` and a known `twoFactorSecret` (e.g. `JBSWY3DPEHPK3PXP`).
3. **Request Simulation (Supertest)**:
   * The test uses Speakeasy to generate a valid 6-digit code based on the secret and current time.
   * Supertest sends a mock `POST /api/v1/auth/verify-2fa` request containing `{ tempToken, code }` to the in-memory Express app instance.
4. **Assertions**:
   * The test asserts that the response status code is `200 OK`.
   * Asserts that the response payload contains a valid access token.
   * Asserts that the user ID in the returned token matches the seeded user ID.
5. **Teardown**:
   * The `afterEach` hook runs a database cleanup script: `TRUNCATE TABLE "User" CASCADE`. This wipes user records and dependent columns cleanly, preparing the database for the next isolated test.

---

## 4. Classes (Test Mock Registry)

Testing mocks are written as structured helper functions rather than complex classes.

### `TestHelpers` (Auth Simulator)
* **Purpose**: Generates mock authentication headers and database seed payloads for integration tests.
* **Responsibilities**:
  * Creates temporary and access tokens for specific user roles.
  * Seeds workspaces, boards, and tasks with correct foreign keys.
  * Captures and returns created IDs to simplify assertions.
* **Why This Design**: Centralizing seeding logic prevents test configuration bloat and guarantees that test states are built consistently across routes.

---

## 5. Functions

### `cleanTestDatabase()`
* **Purpose**: Wipes all database tables in cascade order to ensure test isolation.
* **Parameters**: None.
* **Return Value**: `Promise<void>`.
* **Execution**:
  ```typescript
  const tableNames = ['User', 'Workspace', 'Project', 'Board', 'Column', 'Task', 'TimeLog'];
  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
  ```
* **Why Written This Way**: Using `TRUNCATE ... CASCADE` wipes tables and their dependents instantly, avoiding foreign key check blockages and keeping cleanup times under 50ms.

---

## 6. Architecture Discussion

### Test Isolation & Mocking Boundaries
* **Database Isolation**: We run tests against a real, local PostgreSQL database instance instead of mocking database methods. Mocking ORM calls hides database constraint violations (like nullability checks or unique key collisions) that would crash the application in production.
* **Network Mocking**: Outbound HTTP requests to external services (like Google OAuth verification) are mocked. If we depend on external APIs, our tests will fail during network outages or if rate limits are reached on the external API.

---

## 7. Interview Questions

### Easy (15)

#### 1. What is Jest?
* **Answer**: A popular JavaScript testing framework designed for simplicity and support for assertions, mocking, and coverage reports.
* **Explanation**: Jest acts as our test runner, executing our test files and reporting results.
* **Follow-up**: *What command runs Jest tests?* `npm test`.
* **Common Mistakes**: Conflating Jest with browser-native automation tools.

#### 2. What is Supertest?
* **Answer**: A Node.js library used to test HTTP servers by simulating requests without binding the application to a live network port.
* **Explanation**: It mounts our Express app in memory, allowing us to test route controllers fast.
* **Follow-up**: *How does it initialize the server?* It wraps the Express app instance and triggers requests directly using Node's HTTP interfaces.
* **Common Mistakes**: Starting a live backend server process on port 5000 before running Supertest.

#### 3. What is the difference between a Unit Test and an Integration Test?
* **Answer**: Unit tests verify single functions or classes in isolation. Integration tests verify how multiple modules (controllers, database, middlewares) work together.
* **Explanation**: Testing a date formatter is a unit test; testing the task creation endpoint is an integration test.
* **Follow-up**: *Which one takes longer to run?* Integration tests, as they interact with database pools and network states.
* **Common Mistakes**: Claiming integration tests only test microservices.

#### 4. What is a Mock?
* **Answer**: A fake object or function that simulates the behavior of real code, allowing developers to isolate the code under test.
* **Explanation**: We mock the Google OAuth token verification API to avoid making outbound network requests in tests.
* **Follow-up**: *How do you create a mock in Jest?* Using `jest.fn()` or `jest.mock()`.
* **Common Mistakes**: Mocking database outputs in integration tests where real validations are required.

#### 5. What is Code Coverage?
* **Answer**: A metric that measures the percentage of source code lines, branches, and functions executed during test runs.
* **Explanation**: Jest compiles coverage reports when run with the `--coverage` flag.
* **Follow-up**: *Does 100% coverage guarantee zero bugs?* No, coverage only verifies that lines are executed; it does not guarantee that all logical edge cases are asserted.
* **Common Mistakes**: Writing poor assertions just to increase coverage scores.

#### 6. What does `afterAll` hook do in Jest?
* **Answer**: A teardown function that runs once after all test blocks in a file have completed.
* **Explanation**: We use `afterAll` to close database connection pools and cleanup server instances.
* **Follow-up**: *What happens if you forget to close database connections?* Jest will warning that the test suite did not exit cleanly.
* **Common Mistakes**: Performing page-level cleanups in `afterAll` instead of `afterEach`.

#### 7. What is test isolation?
* **Answer**: The practice of running each test block independently, ensuring changes made by one test do not affect subsequent tests.
* **Explanation**: We clean database tables before or after each test to maintain isolation.
* **Follow-up**: *Why is it important?* To prevent flaky tests that pass individually but fail when run in a suite.
* **Common Mistakes**: Sharing seeded database rows across multiple tests without cleaning them.

#### 8. What does `describe` block do in Jest?
* **Answer**: A function used to group related test blocks together, organizing the test suite structure.
* **Explanation**: We group workspace endpoint tests inside a `describe('Workspace Endpoints')` block.
* **Follow-up**: *Can describe blocks be nested?* Yes, to organize sub-features.
* **Common Mistakes**: Writing assertions directly inside `describe` blocks instead of `test` or `it` blocks.

#### 9. What is an assertion?
* **Answer**: A logical statement that verifies if the actual outcome of a test matches the expected outcome.
* **Explanation**: In Jest, assertions use the `expect()` syntax (e.g. `expect(response.status).toBe(200)`).
* **Follow-up**: *What happens when an assertion fails?* Jest halts the test block and reports the mismatch.
* **Common Mistakes**: Writing tests without assertions (they will always pass unless code crashes).

#### 10. What is a flaky test?
* **Answer**: A test that returns different results (pass or fail) across runs without any code modifications.
* **Explanation**: Flakiness is usually caused by race conditions, network dependencies, or shared global states.
* **Follow-up**: *How do you resolve flakiness?* By isolating database states and mocking external network requests.
* **Common Mistakes**: Ignoring flaky tests and retrying builds until they pass.

#### 11. What is the role of `jest.config.js`?
* **Answer**: A configuration file used to define Jest settings, such as test environments, directories, and coverage thresholds.
* **Explanation**: We configure Jest to use the Node environment and map TypeScript compilation options.
* **Follow-up**: *What test environment is used for backend testing?* `node`.
* **Common Mistakes**: Using the browser `jsdom` environment for backend API tests.

#### 12. What does `beforeEach` hook do?
* **Answer**: A setup function that runs before each individual test block in a file.
* **Explanation**: We use `beforeEach` to seed test users and clean database tables.
* **Follow-up**: *How does it differ from beforeAll?* beforeAll runs once before all tests; beforeEach runs before every single test block.
* **Common Mistakes**: Running slow migration scripts inside `beforeEach`.

#### 13. What is the purpose of mock implementation?
* **Answer**: To override a mock function's behavior with custom return values or execution logic during a test run.
* **Explanation**: We use `mockImplementation` to return specific profiles for Google tokens.
* **Follow-up**: *What method overrides a function once?* `mockImplementationOnce`.
* **Common Mistakes**: Forgetting to restore the original function implementation after tests.

#### 14. What is a test runner?
* **Answer**: A tool that locates test files, executes test blocks, runs assertions, and reports results.
* **Explanation**: Jest is our test runner.
* **Follow-up**: *How does Jest find test files?* By scanning directories for files with `.test.ts` or `.spec.ts` extensions.
* **Common Mistakes**: Running test files manually using Node.js.

#### 15. What is the purpose of `jest.spyOn()`?
* **Answer**: Creates a mock wrapper around an existing object method, allowing developers to track calls, arguments, and return values without modifying the original implementation.
* **Explanation**: We spy on `console.error` to assert that error messages are logged during validation failures.
* **Follow-up**: *How do you restore the original method?* Calling `mockRestore()` on the spy.
* **Common Mistakes**: Spying on non-existent object properties.

---

### Medium (20)

#### 1. How do you design an integration test database cleanup strategy that is fast and safe from foreign key constraint errors?
* **Interviewer's Intent**: To check database testing best practices and transactional teardown designs.
* **Answer**: We avoid running slow migration resets (`migrate reset`) between tests. Instead, we write a database cleanup utility that runs before or after each test block. The utility executes raw SQL `TRUNCATE TABLE "TableName" CASCADE` commands for all tables. The `CASCADE` parameter prompts PostgreSQL to automatically delete dependent child rows first, preventing foreign key check errors and keeping cleanups under 50ms.
* **Why Interviewer Asks**: Poorly designed database cleanups slow down integration tests, leading developers to skip running test suites.
* **Common Mistakes**: Rebuilding the schema using migrations before every single test block.
* **Follow-up**: *Why do we truncate instead of deleting?* Truncate is faster because it bypasses row-level transaction logging and locks tables directly.
* **Production Example**: Test teardown scripts.

#### 2. How do you mock external OAuth APIs (like Google Login validation) in Jest integration tests?
* **Interviewer's Intent**: To check network dependency isolation and mocking strategies.
* **Answer**: We mock Node's global `fetch` function (or the HTTP client library). During the test execution, we intercept calls directed to Google's tokeninfo URL:
  ```typescript
  jest.spyOn(global, 'fetch').mockImplementation((url) => {
    if (url.includes('oauth2.googleapis.com')) {
      return Promise.resolve({
        json: () => Promise.resolve({ aud: process.env.GOOGLE_CLIENT_ID, email: 'test@gmail.com', name: 'Test User' })
      } as any);
    }
    return Promise.reject(new Error('Unknown URL'));
  });
  ```
* **Why Interviewer Asks**: Relying on live Google API calls in tests causes flakiness, slows down execution, and violates network isolation principles.
* **Common Mistakes**: Making live HTTP requests inside automated test environments.
* **Follow-up**: *How do you test error responses from Google?* By mock returning payloads with invalid signatures or mismatched client IDs.
* **Production Example**: OAuth integration tests.

#### 3. How do you assert database side-effects in API integration tests?
* **Interviewer's Intent**: To verify verification completeness in database transactions.
* **Answer**: We do not assert based on HTTP response payloads alone. After receiving a successful response (e.g. `201 Created` for task creation), we query the PostgreSQL test database directly using the Prisma Client (`prisma.task.findUnique()`) to verify the record was physically written with the correct parameters and relations.
* **Why Interviewer Asks**: API responses can return success even if database transactions fail to save all properties correctly.
* **Common Mistakes**: Relying strictly on API status codes to verify database writes.
* **Follow-up**: *What should you do if the database record is missing?* The assertion fails, reporting the data discrepancy.
* **Production Example**: Task creation test assertions.

#### 4. How do you test role-based access control (RBAC) boundaries on protected endpoints?
* **Interviewer's Intent**: To check security verification completeness in testing.
* **Answer**: We write test blocks for each role configuration. For a project deletion endpoint (`DELETE /projects/:id`), we seed workspace members with roles: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER`. We execute request simulations for each role. We assert that `OWNER` and `ADMIN` return `200 OK`, while `MEMBER` and `VIEWER` return `403 Forbidden`.
* **Why Interviewer Asks**: Missing role validation tests can allow security bugs to bypass manual verification checks.
* **Common Mistakes**: Testing only success paths and ignoring permission checks.
* **Follow-up**: *How do we pass authorization in tests?* By signing mock JWTs for each user role and appending them to request headers.
* **Production Example**: RBAC testing sweeps.

#### 5. Why do we avoid using in-memory SQLite databases for integration tests when our production database is PostgreSQL?
* **Interviewer's Intent**: To evaluate database testing environment design decisions.
* **Answer**: SQLite and PostgreSQL have different SQL syntax, data types, indexes, and constraint capabilities. SQLite does not support PostgreSQL features like JSONB columns, composite primary keys, or array types, which would cause Prisma queries to behave differently.
* **Why Interviewer Asks**: Tests passing on SQLite can easily crash PostgreSQL in production due to syntax discrepancies.
* **Common Mistakes**: Using SQLite in CI pipelines because it runs faster, ignoring compatibility risks.
* **Follow-up**: *What tool spins up isolated Postgres instances fast?* Docker containers.
* **Production Example**: Testing setup configurations.

#### 6. What is the difference between `jest.mock()` and `jest.spyOn()`?
* **Answer**: `jest.mock()` mocks an entire module's exports globally for all tests in a file. `jest.spyOn()` wraps an existing object method, allowing developers to track calls while preserving the original implementation, and can be restored.
* **Why Interviewer Asks**: Tests mocking API understanding.
* **Common Mistakes**: Mocking entire modules when you only need to spy on a single utility method.
* **Follow-up**: *Which is easier to restore?* `jest.spyOn()`, as it provides `mockRestore()` to revert changes.
* **Production Example**: Mocking file systems or loggers.

#### 7. How do you test validation schemas in Express routes?
* **Answer**: We send requests with invalid payload structures (e.g. missing titles, wrong data types) to endpoints and assert that they return `400 Bad Request` containing validation details.
* **Why Interviewer Asks**: Verifies input security validation tests.
* **Common Mistakes**: Skipping validation tests, assuming the compiler catches runtime payloads.
* **Follow-up**: *How do we verify Joi/Zod structures directly?* By running unit tests against the schema objects using `.safeParse()` or `.validate()`.
* **Production Example**: Route validation tests.

#### 8. How do you test race conditions in task card sorting?
* **Answer**: We dispatch multiple concurrent reorder requests to the server and assert that the database reorder logs calculate correct indices without index duplicate exceptions.
* **Why Interviewer Asks**: Concurrency bugs like reorder conflicts are common in collaboration tools.
* **Common Mistakes**: Testing only single drag events in isolation.
* **Follow-up**: *What database isolation level prevents index conflicts?* Repeatable Read or Serializable transactions.
* **Production Example**: Drag reorder integration tests.

#### 9. What is the purpose of test seeding?
* **Answer**: Populating the test database with a clean, predictable set of records required for the tests to run (e.g., seeding a workspace before testing project creation).
* **Why Interviewer Asks**: Essential for integration test structure.
* **Common Mistakes**: Relying on records created by preceding test files, which breaks isolation.
* **Follow-up**: *Where should seeding happen?* Inside `beforeEach` hooks or inside the test block itself.
* **Production Example**: Workspace seed utilities.

#### 10. How do you test file upload APIs?
* **Answer**: We use Supertest's `.attach()` method to upload mock files, and assert that the file is saved to the correct directory and metadata is written to the database.
* **Why Interviewer Asks**: Tests file upload validation checks.
* **Common Mistakes**: Uploading large real files, which slows down tests.
* **Follow-up**: *How do you mock the file stream?* By using a small buffer stream in tests.
* **Production Example**: Attachment upload tests.

#### 11. What is the difference between `toBe` and `toEqual` in Jest?
* **Answer**: `toBe` performs a referential equality check (`Object.is`). `toEqual` performs a deep comparison of object properties.
* **Why Interviewer Asks**: Clarifies assertion syntax.
* **Common Mistakes**: Using `toBe` to compare two separate object instances with matching properties (it will fail).
* **Follow-up**: *Which one should you use for arrays?* `toEqual`.
* **Production Example**: Asserting JSON response payloads.

#### 12. How do you test WebSocket events?
* **Answer**: We establish a client connection using a WebSocket client library, trigger API mutations, and assert that the client receives the expected socket event payloads.
* **Why Interviewer Asks**: Real-time integration testing checks.
* **Common Mistakes**: Mocking socket connections completely, bypassing event transmission checks.
* **Follow-up**: *How do you coordinate connections in tests?* By booting a test HTTP server instance during setup.
* **Production Example**: Socket.io integration tests.

#### 13. How do you configure Jest to run tests sequentially?
* **Answer**: By running Jest with the `--runInBand` flag. This forces tests to run in a single thread, preventing database conflicts caused by concurrent tests writing to the same tables.
* **Why Interviewer Asks**: Critical for databases integration tests.
* **Common Mistakes**: Running tests in parallel when they share a single test database instance.
* **Follow-up**: *What is the default behavior?* Jest runs test files in parallel across worker threads.
* **Production Example**: Test configuration scripts.

#### 14. What is the purpose of mocking system time in tests?
* **Answer**: To test time-dependent logic (like token expiration or stopwatch tracking) consistently, preventing tests from failing due to execution delays.
* **Why Interviewer Asks**: Tests time-dependent verification checks.
* **Common Mistakes**: Using real timeouts (`setTimeout`) in tests, which slows down execution.
* **Follow-up**: *How do you mock time in Jest?* Using `jest.useFakeTimers()` and `jest.advanceTimersByTime()`.
* **Production Example**: Testing token expiries.

#### 15. How do you test email notifications?
* **Answer**: We mock the mail transport object and assert that the send method was called with the correct recipient and template parameters.
* **Why Interviewer Asks**: Prevents sending real emails in test runs.
* **Common Mistakes**: Making live SMTP connections in tests.
* **Follow-up**: *What library simplifies SMTP mocking?* `nodemailer-mock`.
* **Production Example**: Auth welcome email tests.

#### 16. What is the difference between mock validation and spy validation?
* **Answer**: Mock validation checks if a mock function was called and asserts on arguments. Spy validation tracks method calls on live modules without overriding their behavior.
* **Why Interviewer Asks**: Differentiates mocking styles.
* **Common Mistakes**: Assuming spies cannot track call arguments.
* **Follow-up**: *What matcher asserts call counts?* `toHaveBeenCalledTimes(N)`.
* **Production Example**: Verifying logger calls.

#### 17. How do you test database rollback on failed transactions?
* **Answer**: We trigger a transaction that executes a valid write followed by an invalid query, and assert that the first write was rolled back and is not present in the database.
* **Why Interviewer Asks**: Verifies transactional integrity tests.
* **Common Mistakes**: Ignoring rollback assertions in critical pipelines.
* **Follow-up**: *How do you trigger failures?* By passing invalid foreign keys in nested writes.
* **Production Example**: Transaction rollback tests.

#### 18. How do you measure API test execution speeds?
* **Answer**: By running tests with Jest profiling flags or logging execution timestamps inside test blocks, identifying slow queries or setups.
* **Why Interviewer Asks**: Slow tests slow down deployment pipelines.
* **Common Mistakes**: Ignoring slow test suites until they become bottlenecks.
* **Follow-up**: *What Jest parameter displays slow tests?* `--verbose` or `--slow-test-threshold`.
* **Production Example**: CI build analysis.

#### 19. How do you test cookie-based session verification?
* **Answer**: We extract the `Set-Cookie` header from login responses and pass the cookie string in subsequent request headers using Supertest.
* **Why Interviewer Asks**: Session security integration checks.
* **Common Mistakes**: Testing cookie attributes only on the client.
* **Follow-up**: *How do we pass it?* Using `.set('Cookie', cookieString)`.
* **Production Example**: Cookie auth tests.

#### 20. What is a test fixture?
* **Answer**: A set of static mock data used to initialize test environments consistently (e.g. static user profiles in JSON files).
* **Why Interviewer Asks**: Promotes code reusability in tests.
* **Common Mistakes**: Creating random mock properties inline inside every test file.
* **Follow-up**: *Where are they stored?* In a `fixtures` folder inside the test directory.
* **Production Example**: Test mock fixtures.

---

### Hard (20)

#### 1. How would you design a test suite to verify WebSocket scaling resilience across 10 API nodes using a Redis Pub/Sub adapter?
* **Detailed Answer**:
  1. Boot a local Redis container in the test environment.
  2. Boot two distinct Express/Socket.io server instances programmatically in the test, both configured to use the Redis adapter.
  3. Establish Client A connection to Server 1, and Client B connection to Server 2.
  4. Client A joins room `project_X` and Client B joins room `project_X`.
  5. Trigger a mutation via Server 1's REST API, which broadcasts a `task:created` event.
  6. Assert that Client B (connected to Server 2) receives the socket event within 100ms.
* **Deep Explanation**: Testing WebSocket scaling requires asserting that events publish across server nodes via Redis. Mocking single instance connections ignores cluster sync issues.
* **Alternative Approach**: Mocking the Redis Pub/Sub wrapper.
  * *Pros*: Simple, runs without booting a real Redis container.
  * *Cons*: Fails to verify actual connection and synchronization issues across Redis nodes.
* **Production Example**: Real-time collaborative infrastructure tests.
* **Cross Questions**: *How do you cleanup connections?* We call `socket.disconnect()` and close the Redis client pool in `afterAll` hooks to prevent hanging processes.

#### 2. How do you design and test a zero-downtime database migration pipeline in CI/CD?
* **Detailed Answer**: 
  1. We write a CI workflow that runs after migration files are generated.
  2. The workflow spins up a temporary database container and restores a copy of the production schema.
  3. It applies the pending migrations using `npx prisma migrate deploy`.
  4. Runs compatibility tests against the updated database schema using the old version of the application code to verify backward-compatibility.
  5. Runs integration tests using the new code version to verify forward-compatibility.
* **Deep Explanation**: This expand/contract validation process ensures that both application versions can run concurrently during deployment without throwing database errors.
* **Alternative Approach**: Running migrations directly in production and rolling back on errors.
  * *Pros*: Low CI setup complexity.
  * *Cons*: High risk of downtime and data corruption if migrations fail.
* **Production Example**: Migrations verification pipelines.
* **Cross Questions**: *How do you generate production-like datasets for tests?* By using anonymized database dumps in staging environments.

#### 3. How do you implement mock verification for third-party payment gateways (like Stripe webhook processing)?
* **Detailed Answer**:
  1. We configure our integration test to mock the payment gateway's signature validator, or inject a test signature secret in environment variables.
  2. Generate a mock webhook payload containing payment events (e.g. `invoice.payment_succeeded`).
  3. Calculate a valid HMAC-SHA256 signature using the test secret and payload body.
  4. Supertest sends a `POST /api/v1/billing/webhook` request with the mock signature header.
  5. Assert that the API processes the webhook, updates workspace subscription statuses, and returns `200 OK`.
* **Deep Explanation**: Stripe webhooks use signatures to prevent attackers from sending fake payment updates. Mocking the signature generation logic is required to test the complete validation pipeline.
* **Alternative Approach**: Mocking the controller and executing billing updates directly in tests.
  * *Pros*: Simple, runs without signature verification checks.
  * *Cons*: Bypasses the security check, leaving the webhook route unverified.
* **Production Example**: Webhook integration tests.
* **Cross Questions**: *What status does Stripe expect on success?* `200 OK` or `204 No Content`.

#### 4. How do you test for memory leaks in Node.js applications using automated tests?
* **Detailed Answer**: We write a Jest test running in the Node environment.
  1. We enable V8 garbage collection flags in the Jest command: `--expose-gc`.
  2. In the test, we record initial memory: `const memStart = process.memoryUsage().heapUsed;`.
  3. Run the target code block (like a mock stopwatch timer) 1,000 times in a loop.
  4. Call the garbage collector manually: `global.gc()`.
  5. Record final memory: `const memEnd = process.memoryUsage().heapUsed;`.
  6. Assert that `memEnd - memStart` is close to 0, ensuring no references are retained.
* **Deep Explanation**: Automated memory checks prevent memory leaks (like un-cleared intervals) from slipping into production builds.
* **Alternative Approach**: Monitoring memory metrics in production.
  * *Pros*: Simple, zero testing code required.
  * *Cons*: Detects memory leaks only after they cause production crashes.
* **Production Example**: Memory leak testing in high-interaction applications.
* **Cross Questions**: *Why is global.gc() required?* Because V8 running under standard configurations runs garbage collection lazily, producing inaccurate memory readings.

#### 5. How would you test a distributed lock system using Redis to prevent double-booking issues?
* **Detailed Answer**:
  1. Spin up a Redis container.
  2. In the test, we spin up two concurrent request threads that attempt to lock the same resource: `lockService.acquire('resource_X')`.
  3. Assert that only one thread succeeds (returns true), while the second thread receives false or blocks.
  4. Release the lock from the first thread and assert that the second thread can now acquire it.
* **Deep Explanation**: Testing distributed locks requires concurrent request coordination to verify locking reliability.
* **Alternative Approach**: Mocking the lock client.
  * *Pros*: Simple, runs without booting a real Redis container.
  * *Cons*: Fails to verify actual connection and synchronization issues across Redis nodes.
* **Production Example**: Distributed locks verification.
* **Cross Questions**: *What algorithm coordinates locks?* Redlock algorithm.

#### 6. What is the difference between structural testing and behavioral testing?
* **Answer**: Structural testing (white-box) tests code implementation details (like branch execution paths). Behavioral testing (black-box) asserts outcomes based on inputs, ignoring internal implementation.
* **Why Interviewer Asks**: Tests testing design philosophy.
* **Common Mistakes**: Writing tests that assert private class properties, which break on refactoring.
* **Follow-up**: *Which is preferred?* Behavioral testing, as it allows refactoring code without breaking tests.
* **Production Example**: Testing API response payloads.

#### 7. How do you configure Jest to output HTML coverage reports?
* **Answer**: By configuring `coverageReporters` in `jest.config.js` to include `html`. Jest will generate a `coverage/index.html` file that can be opened in browsers to inspect coverage details.
* **Why Interviewer Asks**: Useful for code review analysis.
* **Common Mistakes**: Relying only on console logs to inspect coverage.
* **Follow-up**: *What other formats are supported?* `json`, `lcov`, and `text`.
* **Production Example**: Coverage configuration.

#### 8. How do you test for SQL injection vulnerabilities?
* **Answer**: We send requests containing SQL injection payloads (e.g. `' OR '1'='1`) to input parameters, and assert that the database returns validation errors or empty results, verifying that the input was not executed as SQL.
* **Why Interviewer Asks**: Critical security compliance check.
* **Common Mistakes**: Relying on database error responses to verify safety.
* **Follow-up**: *What prevents SQL injection?* Parameterized queries.
* **Production Example**: Security scanning integration.

#### 9. What is the purpose of the `jest.restoreAllMocks()` call?
* **Answer**: Restores all mocks created using `jest.spyOn()` back to their original implementations, preventing mock definitions from leaking into other test files.
* **Why Interviewer Asks**: Important test hygiene practice.
* **Common Mistakes**: Leaving mock spy definitions active, causing subsequent tests to behave unexpectedly.
* **Follow-up**: *Where should you call it?* Inside the `afterEach` hook.
* **Production Example**: Test cleanup hooks.

#### 10. How do you test rate limiting quotas for different API tiers?
* **Answer**: We seed users with different tiers, send requests up to their quota limits, and assert that subsequent requests return `429 Too Many Requests`.
* **Why Interviewer Asks**: Tests dynamic rate limiting configurations.
* **Common Mistakes**: Testing only a single quota threshold.
* **Follow-up**: *How do we speed up these tests?* By configuring lower rate limit thresholds in test environments.
* **Production Example**: Tiered rate limit tests.

#### 11. What is mutation testing?
* **Answer**: A testing method where automated tools introduce minor modifications (mutations) to source code (like swapping `<` to `>`) and run tests. If tests still pass, it indicates that the assertions are weak.
* **Why Interviewer Asks**: Advanced testing concept checking test suite strength.
* **Common Mistakes**: Conflating mutation testing with React state mutations.
* **Follow-up**: *What tool does this in JavaScript?* Stryker Mutator.
* **Production Example**: Quality analysis workflows.

#### 12. How do you test database transaction isolation behaviors?
* **Answer**: We spin up two concurrent database clients, run overlapping read/write transactions, and assert that database modifications are isolated based on the configured isolation level (e.g. Read Committed vs Serializable).
* **Why Interviewer Asks**: Tests concurrency design.
* **Common Mistakes**: Testing transactions using a single client session.
* **Follow-up**: *What SQL command locks rows?* `SELECT ... FOR UPDATE`.
* **Production Example**: Isolation tests.

#### 13. How do you configure Jest to run tests matching specific filenames?
* **Answer**: By running `jest <filename_pattern>` or using the `-t` flag to match test names.
* **Why Interviewer Asks**: Useful for running specific tests during development.
* **Common Mistakes**: Running the entire test suite on every minor code edit.
* **Follow-up**: *How do you run Jest in watch mode?* `jest --watch`.
* **Production Example**: Development workflow scripts.

#### 14. What is the difference between a stub and a spy?
* **Answer**: A stub replaces a module's method to return fixed data, ignoring the original logic. A spy wraps the method to record calls while preserving the original implementation.
* **Why Interviewer Asks**: Clarifies mocking terminology.
* **Common Mistakes**: Using stubs when you need to assert internal call execution.
* **Follow-up**: *Which one does `jest.fn()` create?* A stub.
* **Production Example**: Stubbing external dependencies.

#### 15. How do you test memory usage in JavaScript files?
* **Answer**: By checking `process.memoryUsage()` before and after execution, ensuring no memory accumulation occurs.
* **Why Interviewer Asks**: Essential for long-running scripts.
* **Common Mistakes**: Relying only on manual OS process monitoring.
* **Follow-up**: *What property tracks heap usage?* `heapUsed`.
* **Production Example**: Script performance audits.

#### 16. How do you test APIs that rely on third-party webhooks?
* **Answer**: We simulate webhook events by sending mock POST requests to our webhook endpoint, calculating signatures using test secrets, and asserting database side-effects.
* **Why Interviewer Asks**: Tests integration boundary validations.
* **Common Mistakes**: Bypassing signature verification checks in tests.
* **Follow-up**: *How do you mock the third-party client?* By using signature generation helpers.
* **Production Example**: Webhook tests.

#### 17. How do you test error handling in async controllers?
* **Answer**: We mock database calls to throw errors, call the controller, and assert that the error is caught and forwarded to the centralized error handler via `next(error)`.
* **Why Interviewer Asks**: Ensures error recovery pipelines work.
* **Common Mistakes**: Ignoring error paths, assuming code always succeeds.
* **Follow-up**: *How do we spy on next?* By passing a mock function `const next = jest.fn()`.
* **Production Example**: Error handling tests.

#### 18. What is the benefit of test-driven development (TDD)?
* **Answer**: TDD writes tests before code. It ensures requirements are fully understood, leads to modular code structures, and guarantees all code has matching tests.
* **Why Interviewer Asks**: Tests development methodologies.
* **Common Mistakes**: Hardcoding implementations to pass tests without checking general logic.
* **Follow-up**: *What is the TDD lifecycle?* Red (write failing test), Green (write code to pass), Refactor.
* **Production Example**: TDD in utility functions.

#### 19. How do you test CORS configurations?
* **Answer**: We send `OPTIONS` preflight requests containing specific origin headers, and assert that the response headers contain the expected access-control values.
* **Why Interviewer Asks**: Critical security configuration check.
* **Common Mistakes**: Testing CORS only on GET requests.
* **Follow-up**: *What header specifies the origin?* `Origin`.
* **Production Example**: CORS integration tests.

#### 20. How do you test for transaction deadlocks?
* **Answer**: We execute two concurrent transactions that request locks on the same rows in reverse order, and assert that PostgreSQL detects the deadlock, rolls back one transaction, and throws the deadlock error code (`40P01`).
* **Why Interviewer Asks**: Tests concurrency deadlock recovery.
* **Common Mistakes**: Assuming deadlocks cannot happen if queries are fast.
* **Follow-up**: *How do you prevent them?* By ordering row updates consistently across transactions.
* **Production Example**: Concurrency safety audits.

---

## 8. Resume-Based Questions

### How did you secure your test database configuration?
* **Answer**: The test database is hosted in an isolated container environment and runs on a dedicated port. Test connection URLs are injected at runtime via environment variables, ensuring tests never connect to or modify production databases.

### How did you test Google OAuth token exchanges?
* **Answer**: We mock the Google token verification endpoint in our integration tests. The test sends a mock token, intercepts the fetch request to return a valid profile, and asserts that our backend registers the user and returns an access token.

---

## 9. Code Review Questions

### Why do you run `cleanTestDatabase` in `afterEach` instead of `beforeEach`?
* **Answer**: Running it in `afterEach` ensures that the database is cleared immediately after tests complete, leaving the database clean and preventing connection errors or stale data from affecting subsequent runs.

### Why do you check next call signatures in controller tests?
* **Answer**: Spying on the `next` callback ensures that if an error occurs in the controller, it is caught and forwarded to the centralized error handler, preventing unhandled exceptions from hanging the server.

---

## 10. Production Readiness

### CI Verification
* The CI pipeline blocks PR merges if tests fail or test coverage drops below the configured threshold, preserving production stability.

### Isolated Database
* Test databases must run in isolated container environments to prevent test execution conflicts.

---

## 11. Common Mistakes

* **Sharing database states**: Sharing records across tests without cleanups, causing flakiness.
* **Making live network calls**: Depending on external APIs in test suites.
* **Mocking database constraints**: Mocking database methods in integration tests, bypassing integrity checks.

---

## 12. Cheat Sheet

* **Test runner**: Jest executes tests; Supertest simulates HTTP requests.
* **Teardown**: Run `TRUNCATE TABLE "Name" CASCADE` to clean tables fast.
* **Mocking**: Use `jest.spyOn()` to mock global fetch calls.

---

## 13. Mock Interview

### 1. What happens if a test leaves database records active?
* **Interviewer Expectations**: Test isolation failure.
* **Ideal Answer**: Subsequent tests can fail due to duplicate key conflicts or unexpected data, leading to flaky test results.

### 2. Can you test private methods in Jest?
* **Interviewer Expectations**: Object encapsulation awareness.
* **Ideal Answer**: No, we test public interfaces; testing private methods binds tests to implementation details.

### 3. How do you test APIs that use Redis cache?
* **Interviewer Expectations**: Cache testing.
* **Ideal Answer**: We run tests against a real Redis test container, or mock the Redis client wrapper if connection tests are out of scope.

---

## 14. Summary

1. TaskFlow uses Jest and Supertest to verify backend APIs.
2. Integration tests run against an isolated PostgreSQL test database.
3. Truncate cascade scripts clean tables between tests in under 50ms.
4. Spies mock external Google OAuth token verification APIs.
5. Integration tests assert database writes using Prisma directly.
6. RBAC tests verify endpoint access configurations.
7. Unit tests verify schemas and utilities in isolation.
8. Non-interactive migrations setup database schemas for tests.
9. Mock auth helpers generate test credentials.
10. Test suites run sequentially to prevent database conflicts.
