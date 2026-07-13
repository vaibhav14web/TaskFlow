# Module 07: Business Logic & Task Board Extensions

---

## 1. Purpose

### Why This Module Exists
The **Business Logic & Task Board Extensions** module represents the core functional value-add of TaskFlow. In senior engineering interviews, candidates are evaluated on their ability to translate complex, domain-specific requirements (like task grouping, calendar grid alignments, real-time stopwatch session management, and ledger billing calculations) into reliable, scalable code.

### What Problem It Solves
Standard Kanban boards are unidimensional (only vertical columns). TaskFlow extends this model to:
* **Swimlanes**: Grouping tasks horizontally (by priority or assignee) so project managers can instantly spot resource constraints.
* **Gantt Calendar**: Visualizing task durations and deadlines.
* **Time Tracking**: Enabling engineers to log hours directly from active tasks.
* **Invoicing**: Automatically converting logged hours into client invoices with dynamic rate and tax parameters.

### How It Interacts With Other Modules
This module sits on top of all preceding modules:
* Reads task dates from the **Database Schema** to compute Timeline positions.
* Dispatches mutations to the **Backend API** during drag transitions.
* Aggregates billing records and handles invoice formatting inside the **Frontend UI**.

```
[ Board View Controller ]
           |
     (activeView)
     /     |      \
 Kanban  Timeline Billing
   |       |        |
   |       |        v
   |       |   [ GET /api/v1/projects/:id/billing ]
   |       |        |
   |       |        v
   |       |   [ Aggregate Total Time ]
   |       |   [ Parse User/Task Breakdowns ]
   |       |   [ Render PDF Invoice Preview ]
   |       |
   |       v
   |   [ Calculate Month Days Grid ]
   |   [ Match Task Start/Due Dates ]
   |   [ Position Task Grid Bars ]
   |
   v
[ GroupBy: None? Standard columns ]
[ GroupBy: Priority/Assignee? Swimlane Rows ]
   |
   v
[ Drag-End: Patch Task Properties ]
```

### Real-World Analogy
Think of this extensions module as a multi-tool pocket knife.
* **Standard Kanban** is the main blade, used for basic cuts (task status).
* **Swimlanes** are horizontal dividers sorting objects. It is like sorting mail by zip code (priority) or carrier (assignee).
* **Gantt Timeline** is a tape measure showing length over time.
* **Time logs & Invoices** represent a parking meter: recording the exact parking duration (stopwatch) and calculating the final payment due based on rates.

---

## 2. High-Level Overview

Task board extensions are built dynamically into the frontend and backend layers, using CSS Grid for calendar layouts and relational queries for aggregations.

---

## 3. Detailed Workflow

Let us trace the swimlane transition flow: **A user drags a task from the "Medium" row to the "Urgent" row.**

### Execution Sequence
1. **Target Identification**:
   * The user drags the task card. `DndContext` detects the card is dropped over a cell ID formatted as `cell-${columnId}::${swimlaneKey}` (e.g. `cell-col1-uuid::URGENT`).
   * The client splits the string to extract the destination column ID (`col1-uuid`) and the target priority (`URGENT`).
2. **State Updates**:
   * If the column ID is different, the client updates the task's column location.
   * If the priority is different, the client updates the task's priority to `URGENT`.
3. **API Execution**:
   * The client dispatches a `PATCH /api/v1/tasks/:id` request with `{ columnId: "col1-uuid", priority: "URGENT" }`.
   * The backend processes the update and broadcasts the change via WebSockets.
4. **Timeline Position Calculation**:
   * In the Gantt Timeline view, the component gets the active month and year.
   * For each task, it converts `createdAt` and `dueDate` into calendar dates.
   * It calculates the task's start column index and duration span inside the monthly grid:
     * `Start Column = Task Start Date (or 1 if started earlier)`.
     * `End Column = Task Due Date (or total month days if due later)`.
   * It renders the task bar using CSS Grid offsets: `gridColumnStart: startCol, gridColumnEnd: endCol + 1`.

---

## 4. Classes (Custom Hooks & Models)

Business models are defined in [schema.prisma](file:///c:/Users/vaibh/Projects/TaskFlow/backend/prisma/schema.prisma) and custom hooks handle stateful updates.

### `TimeLog` (Database Model)
* **Purpose**: Stores time logs associated with users and tasks.
* **Key Fields**:
  * `durationSeconds`: `int` (Logged duration in seconds).
  * `description`: `string?` (Task context description).
  * `loggedAt`: `DateTime` (Timestamp of the log action).
* **Why This Design**: Storing durations in seconds prevents precision loss, allowing the application to calculate billing totals down to the second.

---

## 5. Functions

### `getProjectBilling(req, res, next)`
* **Purpose**: Backend endpoint that aggregates billing data for a project.
* **Parameters**:
  * `req.params.projectId`: `string`
* **Return Value**: JSON object containing total hours, logs history, and user/task breakdowns.
* **Time Complexity**: $O(L)$ where $L$ is the number of logs.
* **Execution**:
  ```typescript
  const logs = await prisma.timeLog.findMany({
    where: { task: { column: { board: { projectId } } } },
    include: { task: true, user: true }
  });

  let totalSeconds = 0;
  const taskBreakdown: Record<string, any> = {};
  const userBreakdown: Record<string, any> = {};

  for (const log of logs) {
    totalSeconds += log.durationSeconds;
    // Populate taskBreakdown and userBreakdown mappings...
  }
  res.status(200).json({ data: { totalSeconds, logs, taskBreakdown, userBreakdown } });
  ```
* **Why Written This Way**: Aggregating values inside the controller avoids running multiple database queries, returning the complete invoice parameters in a single payload.

---

## 6. Architecture Discussion

### Swimlane State Machine & Grid Layouts
* **Drop Target Mapping**: We format drop IDs dynamically (e.g. `cell-colId::laneKey`). This allows the drag-and-drop handler to parse the target column and swimlane key during drop events.
* **Print Styling**: We configure print layout overrides using `@media print` in CSS, hiding sidebars, buttons, and navigation elements when generating PDF invoices.

---

## 7. Interview Questions

### Easy (15)

#### 1. What are Swimlanes in project boards?
* **Answer**: Horizontal rows that group tasks by specific attributes (like priority or assignee) across vertical columns.
* **Explanation**: Swimlanes allow project managers to visualize task statuses alongside resource allocations or priority levels.
* **Follow-up**: *What grouping options are supported in TaskFlow?* Priority (Urgent, High, Medium, Low) and Assignee.
* **Common Mistakes**: Thinking swimlanes are separate boards.

#### 2. How is task duration calculated for the Timeline view?
* **Answer**: By calculating the difference in days between the task's `createdAt` date and its `dueDate` (or falling back to a 24-hour default).
* **Explanation**: The client converts dates to timestamps and maps them to grid columns representing the days of the month.
* **Follow-up**: *What happens if the task lacks a due date?* It is rendered as a 1-day block starting from its creation date.
* **Common Mistakes**: Blocking tasks without due dates from rendering in the timeline.

#### 3. How does the live stopwatch track elapsed time?
* **Answer**: It runs a JavaScript `setInterval` loop that increments a counter state variable every second.
* **Explanation**: When the stopwatch is active, the counter increments, and the formatted elapsed time (HH:MM:SS) is rendered on the UI.
* **Follow-up**: *How do you prevent timer loss on page refresh?* By syncing the active timer state to localStorage.
* **Common Mistakes**: Storing active timers inside global React states, which reset on page reload.

#### 4. What is a PDF invoice generator, and how does it work in TaskFlow?
* **Answer**: A feature that renders a printable preview of project billing details and triggers the browser's print dialog (`window.print()`).
* **Explanation**: We use print-friendly CSS overrides to hide navbars and render a professional invoice receipt.
* **Follow-up**: *What library did we use?* Standard HTML/CSS layout templates with native browser print capabilities.
* **Common Mistakes**: Using complex backend PDF conversion libraries for simple client-side receipt downloads.

#### 5. What are the key fields of a TimeLog record?
* **Answer**: `id`, `taskId`, `userId`, `durationSeconds`, `description`, and `loggedAt`.
* **Explanation**: These fields link logs to users and tasks, recording the duration and description.
* **Follow-up**: *Why do we store duration in seconds instead of hours?* To prevent precision loss and support granular stopwatch logging.
* **Common Mistakes**: Storing durations as decimal hours (e.g. `1.5` instead of `5400`).

#### 6. How does the assignee swimlane handle unassigned tasks?
* **Answer**: It creates a dedicated "Unassigned" row at the bottom of the board.
* **Explanation**: Tasks without assignees are grouped in the Unassigned row across columns.
* **Follow-up**: *What happens if you drag a task to a user row?* The task's assignee is updated to that user.
* **Common Mistakes**: Filtering out unassigned tasks in assignee view mode.

#### 7. How does the calendar month switcher work in the Timeline view?
* **Answer**: The component tracks a `currentDate` state variable. Clicking next/prev updates the date by adding/subtracting one month.
* **Explanation**: The monthly grid dynamically adjusts its column count based on the number of days in the active month.
* **Follow-up**: *How do you find the number of days in a month?* Using `new Date(year, month + 1, 0).getDate()`.
* **Common Mistakes**: Hardcoding 30 days for all months.

#### 8. How do you format elapsed seconds into HH:MM:SS format?
* **Answer**: By dividing the total seconds into hours, minutes, and remaining seconds, and padding values with leading zeros.
* **Explanation**:
  * `hours = Math.floor(seconds / 3600)`
  * `minutes = Math.floor((seconds % 3600) / 60)`
  * `secs = seconds % 60`
* **Follow-up**: *What string method adds leading zeros?* `padStart(2, '0')`.
* **Common Mistakes**: Displaying decimal formats (e.g. `1.25 hours`) directly in active timers.

#### 9. Why is the billing dashboard restricted to project members?
* **Answer**: Because billing reports contain sensitive financial details like total logged hours, user rates, and client details.
* **Explanation**: The backend verifies the user's role in the parent workspace before returning billing data.
* **Follow-up**: *Which roles are allowed?* Owner, Admin, and Member. Viewers are blocked.
* **Common Mistakes**: Allowing public unauthenticated access to billing endpoints.

#### 10. What is a Gantt chart?
* **Answer**: A horizontal bar chart that visualizes a project schedule, showing task start dates, durations, and deadlines over time.
* **Explanation**: In TaskFlow, tasks are positioned horizontally along a monthly calendar grid.
* **Follow-up**: *How does it improve task tracking?* It helps identify overlapping deadlines and schedule delays.
* **Common Mistakes**: Thinking Gantt charts are only useful for Agile sprint boards.

#### 11. What is the difference between manual logging and stopwatch logging?
* **Answer**: Manual logging allows users to enter historical hours/minutes and descriptions directly. Stopwatch logging tracks active elapsed time in real-time.
* **Explanation**: Both methods write identical `TimeLog` records containing durations in seconds to the database.
* **Follow-up**: *Can we log time for other users?* No, the backend binds the `userId` of the log to the authenticated requester.
* **Common Mistakes**: Restricting users to stopwatch logging only.

#### 12. How does the invoice calculate taxes?
* **Answer**: By multiplying the subtotal (total hours * hourly rate) by the tax percentage input on the dashboard.
* **Explanation**:
  * `subtotal = hours * rate`
  * `taxAmount = (subtotal * taxRate) / 100`
  * `total = subtotal + taxAmount`
* **Follow-up**: *Are these calculations saved in the database?* No, they are computed dynamically on the frontend.
* **Common Mistakes**: Hardcoding tax parameters in backend controllers.

#### 13. What is the purpose of the description field in a time log?
* **Answer**: To provide context regarding the tasks completed during the logged session.
* **Explanation**: The description is saved alongside the duration, and displayed in log history lists.
* **Follow-up**: *Is it required?* No, it is optional and defaults to null.
* **Common Mistakes**: Requiring descriptions for stopwatch starts (they should be prompted during save/stop).

#### 14. What CSS property hides elements during printing?
* **Answer**: `display: none`.
* **Explanation**: We wrap elements in a `.no-print` class and configure `@media print { .no-print { display: none; } }` in CSS.
* **Follow-up**: *What elements do we hide?* Sidebars, headers, button panels, and filters.
* **Common Mistakes**: Forgetting to hide interactive buttons in printed PDF previews.

#### 15. What does the `Speakeasy` library implement?
* **Answer**: Time-Based One-Time Password (TOTP) cryptographic algorithms matching RFC 6238 standards.
* **Explanation**: It enables integrating authenticator apps for 2FA security.
* **Follow-up**: *Is it related to time tracking?* No, they are separate modules (Speakeasy is for auth; time-log is for project management).
* **Common Mistakes**: Conflating the Speakeasy library with time log tracking functions.

---

### Medium (20)

#### 1. How does the frontend dynamically render task rows in Swimlane view based on the active grouping?
* **Interviewer's Intent**: To check dynamic array manipulation and layout rendering skills.
* **Answer**: We fetch swimlanes configurations dynamically using `getSwimlanes()`. If grouped by priority, it returns a static list of priority levels. If grouped by assignee, it extracts all unique users assigned to tasks on the board. We map over this lane array, filtering and grouping matching tasks for each row cell across columns.
* **Why Interviewer Asks**: Poorly structured grouping loops can cause layout alignment errors or drop tasks from view.
* **Common Mistakes**: Hardcoding rows, which fails when users add or remove assignees on the board.
* **Follow-up**: *How are empty cells rendered?* They display a dashed border drop zone with an "Empty Cell" placeholder.
* **Production Example**: Dynamic row rendering in project dashboards.

#### 2. How does the drag-and-drop handler differentiate standard column sorting from swimlane transitions?
* **Interviewer's Intent**: To check drag-and-drop configuration and parameter parsing skills.
* **Answer**: We format droppable cell IDs with a prefix and delimiters (e.g. `cell-${columnId}::${swimlaneKey}`). During drop events, we check if the target ID starts with `cell-`. If yes, we parse the ID to extract the target column and swimlane value, updating the task's properties. If not, it is treated as standard task reordering.
* **Why Interviewer Asks**: The drag handler must distinguish between reordering items in a list and updating entity properties based on drop locations.
* **Common Mistakes**: Creating separate drag contexts for each view, which adds redundancy.
* **Follow-up**: *What happens if a card is dropped over another card in swimlane mode?* We look up the target card's column and group properties and update the dragged card accordingly.
* **Production Example**: Drag layouts in multi-dimensional project boards.

#### 3. How do you prevent floating-point precision issues when displaying logged hours and totals?
* **Interviewer's Intent**: To check numeric precision handling practices in business applications.
* **Answer**: We perform all time calculations in integer seconds in the database. When converting to hours on the client, we divide by 3600 and format the decimal using `.toFixed(2)` (e.g. `10.25 hours`), or format it as string durations (e.g. `10h 15m`).
* **Why Interviewer Asks**: Storing durations as floats in the database leads to rounding errors over time, causing discrepancies in invoice subtotals.
* **Common Mistakes**: Storing durations as decimal hours directly in the database.
* **Follow-up**: *Why do we avoid using floating-point types for currency calculations?* Because floats cannot represent base-10 decimals exactly, resulting in precision loss (we store currency as cents in integers).
* **Production Example**: Time tracking and billing systems.

#### 4. How would you design a calendar grid in CSS Grid that dynamically adjusts to different month days?
* **Interviewer's Intent**: To check modern CSS layout layout capabilities.
* **Answer**: We configure the monthly grid parent container to use dynamic grid columns based on the number of days: `gridTemplateColumns: repeat(${daysInMonth}, 1fr)`. For task bars, we set the start and end column offsets: `gridColumnStart: startCol, gridColumnEnd: endCol + 1`.
* **Why Interviewer Asks**: Static layouts cannot handle different month lengths (28, 29, 30, 31 days) or look aligned.
* **Common Mistakes**: Using fixed pixel position offsets for timeline bars.
* **Follow-up**: *How do you calculate the start column if a task was created in the previous month?* We cap the start column at `1`.
* **Production Example**: Gantt calendars in dashboards.

#### 5. How do you implement robust stopwatch state restoration when a user closes the browser or refreshes the page?
* **Interviewer's Intent**: To check session recovery design and state persistence practices.
* **Answer**: When the stopwatch is running, we write its parameters to localStorage: `{ startTime: Date.now() - elapsed, isRunning: true, description }`. On page load, if we find active timer parameters, we restore the state, calculate elapsed seconds based on the time difference since startup, and resume the interval.
* **Why Interviewer Asks**: If the stopwatch state is lost on page refresh, users will lose track of active time sessions.
* **Common Mistakes**: Storing stopwatch state only in React component state variables.
* **Follow-up**: *What happens if the user leaves the page open in a background tab?* The interval runs, but we also calculate elapsed time using system timestamps to prevent browser tab throttling from pausing the clock.
* **Production Example**: Time tracking clients.

#### 6. What is the impact of table joins on billing query performance?
* **Answer**: Fetching logs with user and task details requires joining tables. Without indexes on foreign keys (`taskId`, `userId`), PostgreSQL performs full-table scans, which degrade performance as data volumes grow.
* **Why Interviewer Asks**: Tests database query optimization.
* **Common Mistakes**: Performing loops to fetch user profiles for each log entry.
* **Follow-up**: *How did we optimize this?* By indexing the foreign keys and fetching relations in a single join query.
* **Production Example**: Aggregating logs in billing controllers.

#### 7. How does the application enforce deletion rights on time logs?
* **Answer**: The controller validates that the authenticated requester's ID matches the log creator's `userId`. If different, it checks if the user has an `ADMIN` or `OWNER` role in the parent workspace.
* **Why Interviewer Asks**: Essential security validation check for billing data.
* **Common Mistakes**: Permitting any workspace member to delete time logs.
* **Follow-up**: *What status is returned on unauthorized attempts?* `403 Forbidden`.
* **Production Example**: Secure time tracking management.

#### 8. How do you handle print layout margins and page breaks for PDF invoices?
* **Answer**: We use print-specific CSS rules: `@page { margin: 20mm; }` to set page margins, and `page-break-inside: avoid` on table rows to prevent them from splitting across page breaks.
* **Why Interviewer Asks**: Poorly formatted print layouts result in cropped PDFs or cut-off tables.
* **Common Mistakes**: Ignoring print formatting styles, resulting in messy invoice receipts.
* **Follow-up**: *What selector hides elements during printing?* The `.no-print` class with `display: none` under a `@media print` query.
* **Production Example**: Print invoice configurations.

#### 9. Why is it important to prevent negative values in manual time logging?
* **Answer**: Negative values could decrease total project hours, allowing users to deduct tracked hours and corrupting invoice calculations.
* **Why Interviewer Asks**: Tests input validation constraints.
* **Common Mistakes**: Validating values only on the client, which can be bypassed.
* **Follow-up**: *Where is this checked?* In the backend route schema validation before query execution.
* **Production Example**: Input validation checks on time log endpoints.

#### 10. How does the monthly calendar grid handle tasks spanning across multiple months?
* **Answer**: We calculate offsets relative to the active month. If a task starts before the active month, we cap the start column at 1. If it ends after the active month, we cap the end column at the total number of days in that month.
* **Why Interviewer Asks**: Gantt calendars must handle tasks that extend beyond active month boundaries.
* **Common Mistakes**: Crashing the render loop when dates fall outside the active month.
* **Follow-up**: *What if a task starts and ends entirely outside the active month?* The task is filtered out and not rendered.
* **Production Example**: Project timelines.

#### 11. What is the difference between active stopwatch and manual logs in the database?
* **Answer**: In the database, both are stored as identical `TimeLog` records. The difference is only in the creation path: stopwatch logs calculate duration on the client, while manual logs accept user inputs.
* **Why Interviewer Asks**: Explains data modeling simplicity.
* **Common Mistakes**: Creating separate database tables for stopwatch logs and manual logs.
* **Follow-up**: *Can we distinguish them in audit logs?* Yes, by including metadata (like creation source) in activity logs.
* **Production Example**: Time log schemas.

#### 12. How does the application calculate invoice subtotals on the frontend?
* **Answer**: It calculates the total hours from the billing report, multiplies it by the hourly rate input, and calculates the subtotal.
* **Why Interviewer Asks**: Tests client-side calculation execution.
* **Common Mistakes**: Hardcoding calculations or running them on the server when they depend on dynamic inputs.
* **Follow-up**: *How is it formatted?* Using `subtotal.toFixed(2)` for display.
* **Production Example**: Invoices calculators.

#### 13. What is the role of composite indexes in time log queries?
* **Answer**: Composite indexes (e.g. on `TimeLog(taskId, loggedAt)`) speed up queries that fetch logs for a specific task sorted by date.
* **Why Interviewer Asks**: Explains index optimization for time series data.
* **Common Mistakes**: Creating indexes only on single columns.
* **Follow-up**: *How do they improve performance?* By allowing the database to read pre-sorted index segments.
* **Production Example**: Optimizing task log lists.

#### 14. How do you design an interface that remains responsive during heavy printing operations?
* **Answer**: We open the print layout in a separate window or tab, or let the browser trigger the print dialog asynchronously using a separate thread, keeping the main tab responsive.
* **Why Interviewer Asks**: PDF generation can block the browser thread if not managed.
* **Common Mistakes**: Running blocking rendering calculations on the main thread during printing.
* **Follow-up**: *Which command triggers the print dialog?* `window.print()`.
* **Production Example**: Printing invoice receipts.

#### 15. Why do we keep the time tracking database schema isolated from comments?
* **Answer**: They represent different domains: comments are for discussion; time logs are for resource tracking and billing. Keeping them separate maintains clean database design and prevents table bloat.
* **Why Interviewer Asks**: Explains domain boundary design.
* **Common Mistakes**: Merging comments and logs into a single table.
* **Follow-up**: *How do we link them?* They are both linked to the `Task` model via foreign keys.
* **Production Example**: Database schemas.

#### 16. How do you prevent overlapping timeline bars in CSS Grid?
* **Answer**: We position each task row in its own grid track vertically, or set dynamic grid row offsets if tasks overlap on the same dates.
* **Why Interviewer Asks**: Tests CSS Grid layout optimization.
* **Common Mistakes**: Hardcoding row index heights, which causes overlapping text.
* **Follow-up**: *How does TaskFlow handle this?* By rendering one task per vertical row track.
* **Production Example**: Gantt calendars.

#### 17. How do you format invoice dates consistently?
* **Answer**: By using standard browser date formatting APIs (like `toLocaleDateString()`) or libraries (like `date-fns`), which automatically format dates based on the user's locale.
* **Why Interviewer Asks**: Consistently formatted dates are critical for business documents.
* **Common Mistakes**: Hand-rolling string formats, which can fail across browser locales.
* **Follow-up**: *What options are used for month names?* `{ month: 'long' }` returns the full month name.
* **Production Example**: Invoice headers.

#### 18. Why do we run database deletions of time logs in transactions?
* **Answer**: To ensure that if we log the deletion in the activity log, both the time log deletion and the activity log insert succeed together, preserving audit histories.
* **Why Interviewer Asks**: Tests transactional safety in business domains.
* **Common Mistakes**: Deleting records without writing audit logs.
* **Follow-up**: *What if the activity log write fails?* The database rolls back the time log deletion, preventing untracked deletions.
* **Production Example**: Deletion flows.

#### 19. How do you handle page zoom issues when printing invoices?
* **Answer**: By configuring relative sizes (like `%` or `vw`) and using page break styling rules to prevent tables from scaling incorrectly.
* **Why Interviewer Asks**: Layout dimensions can distort when browser print zoom configurations are modified.
* **Common Mistakes**: Using fixed pixel dimensions for print layouts.
* **Follow-up**: *What viewport rule is recommended?* Setting the print width to fit standard page layouts (A4 or Letter).
* **Production Example**: Print stylesheet rules.

#### 20. How do you design a system to support multiple currency options in invoices?
* **Answer**: We store currency codes alongside subscription rates and invoice records, and use native browser formatting APIs (`Intl.NumberFormat`) to format currency totals dynamically on the client.
* **Why Interviewer Asks**: Essential for international applications.
* **Common Mistakes**: Hardcoding currency symbols (like `$`) in UI templates.
* **Follow-up**: *How do you format euros?* `new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
* **Production Example**: Invoices builders.

---

### Hard (20)

#### 1. How would you design a database schema and API to support dynamic task dependencies with automatic scheduling adjustments (critical path calculations)?
* **Detailed Answer**: We model task dependencies using an adjacency list table: `TaskDependency(id, blockedTaskId, blockingTaskId, type)`. When a task's `dueDate` changes, we run a **Topological Sort** algorithm on the dependency graph to identify all downstream blocked tasks, recalculating and updating their schedules to prevent overlaps.
* **Deep Explanation**: 
  1. We parse dependencies as a Directed Acyclic Graph (DAG).
  2. If Task A blocks Task B, and Task A is delayed by 2 days, Task B's start and due dates must shift by 2 days.
  3. We run a DFS (Depth-First Search) to update downstream dates, executing writes inside a database transaction to maintain consistency.
* **Alternative Approach**: Manual scheduling.
  * *Pros*: Simple backend, zero scheduling update queries.
  * *Cons*: Poor user experience, as project managers must update all dates manually when delays occur.
* **Production Example**: Critical path calculations in MS Project or Gantt charts.
* **Cross Questions**: *How do you prevent circular dependencies?* By running cycle detection algorithms (like Kahn's algorithm) before saving new dependency records.

#### 2. How do you design and scale a real-time collaborative invoice editing system where multiple accountants can update line items concurrently?
* **Detailed Answer**: We implement **Operational Transformation (OT)** or **Conflict-Free Replicated Data Types (CRDTs)**. We model invoice changes as atomic operations (e.g. `insertLineItem`, `updateRate`) sent via WebSockets. We run validation checks on the server to resolve conflicts (like double-updating the same field) and merge changes using Yjs algorithms.
* **Deep Explanation**: If Accountant A changes the tax rate while Accountant B adds a line item, the changes must merge automatically without overwriting each other, calculating totals dynamically.
* **Alternative Approach**: Optimistic lock-based fields.
  * *Pros*: Simple, zero conflict resolution logic.
  * *Cons*: Users are blocked from editing fields when other users have them open.
* **Production Example**: Collaborative financial ledger systems.
* **Cross Questions**: *How do you handle audit logs for collaborative edits?* By recording each atomic operation as a distinct audit log entry, mapping changes to the actor's ID.

#### 3. How do you optimize query performance when generating billing invoices for large projects containing over 100,000 time logs?
* **Detailed Answer**: 
  1. We execute **database-side aggregations** using SQL `SUM` and `GROUP BY` queries instead of fetching all 100,000 logs to the client.
  2. Create composite indexes on `TimeLog(taskId, durationSeconds)` and `TimeLog(userId, durationSeconds)`.
  3. Implement incremental view caching (materialized views) that updates periodically, serving cached aggregates for dashboard displays.
* **Deep Explanation**: Fetching 100,000 rows to the client consumes massive server memory, network bandwidth, and client RAM. Running aggregations on PostgreSQL leverages index optimization, returning summary rows in under 10ms.
* **Alternative Approach**: Fetching all logs and aggregating them on the server in JavaScript.
  * *Pros*: Simple SQL query syntax.
  * *Cons*: Consumes server CPU and memory, risking out-of-memory crashes under load.
* **Production Example**: Financial reporting dashboards.
* **Cross Questions**: *What is a Materialized View?* A database view that caches query results physically on disk, offering fast read speeds.

#### 4. How would you handle timezone issues when rendering the monthly Gantt calendar for users located across different regions?
* **Detailed Answer**: We store all timestamps in the database in **UTC (Coordinated Universal Time)**. On the client, we load the user's local timezone (via browser settings or user profile) and convert the UTC timestamps to the target timezone before calculating column offsets in the monthly grid.
* **Deep Explanation**: If a task starts on July 1st at 1:00 AM UTC, it starts on June 30th at 9:00 PM for a user in New York (EDT). We must calculate calendar offsets using the client's local timezone to display tasks on the correct dates.
* **Alternative Approach**: Hardcoding all calculations to UTC.
  * *Pros*: Simple, consistent layouts for all users.
  * *Cons*: Confuses users when task due dates mismatch their local calendar days.
* **Production Example**: Timezone management in Jira or Google Calendar.
* **Cross Questions**: *What JavaScript library simplifies timezone conversions?* `date-fns-tz` or the native browser `Intl` API.

#### 5. How would you design a rate limiter that prevents users from spamming the stopwatch pause/start actions?
* **Detailed Answer**: We implement a **Debounced Rate Limiter** on the client side to block rapid button clicks. On the backend, we rate limit the time log endpoints (e.g. max 10 updates per minute per user) using a Token Bucket algorithm stored in Redis.
* **Deep Explanation**: Rapidly starting and pausing the stopwatch can generate thousands of API calls, spamming the database with write queries.
* **Alternative Approach**: App-level variable limits.
  * *Pros*: Low infrastructure overhead.
  * *Cons*: Easily bypassed by making direct API calls.
* **Production Example**: Click throttling on payment or action buttons.
* **Cross Questions**: *What status is returned when rate limits are exceeded?* `429 Too Many Requests`.

#### 6. What is the impact of table lock escalations on time log inserts?
* **Answer**: If multiple users write logs concurrently, table locks block other insert and update queries, causing requests to queue and time out. We prevent this by ensuring our write transactions are brief and target row-level locks.
* **Why Interviewer Asks**: Tests database concurrency under load.
* **Common Mistakes**: Running slow, complex calculations inside write transactions.
* **Follow-up**: *How does PostgreSQL handle row locks?* Using `SELECT ... FOR UPDATE` or implicit locks during writes.
* **Production Example**: Optimizing time log writes.

#### 7. How do you design a database schema to support custom billable rates per user and per project?
* **Answer**: We create a `ProjectBillingRate` table:
  * `id`: UUID
  * `projectId`: UUID
  * `userId`: UUID
  * `hourlyRate`: Decimal (Stores custom user rate for the project)
  In our invoice calculations, we check if a custom project rate exists; if not, we fallback to the user's default base rate.
* **Why Interviewer Asks**: Tests flexible relational modeling.
* **Common Mistakes**: Storing billing rates directly on the User table, which cannot support different rates across projects.
* **Follow-up**: *How is this query indexed?* We create a composite unique index on `(projectId, userId)`.
* **Production Example**: Invoicing engines in professional services platforms.

#### 8. How do you implement a PDF generator that works offline in the browser?
* **Answer**: By using client-side JavaScript PDF libraries (like `jspdf`). The library reads the DOM, compiles it to a canvas, and generates the PDF binary stream, allowing users to download invoices without making network requests.
* **Why Interviewer Asks**: Offloads document generation from servers and supports offline operations.
* **Common Mistakes**: Sending HTML payloads to external API services for conversion.
* **Follow-up**: *What is the drawback of client-side PDF generation?* Limited font support and layout discrepancies across browsers.
* **Production Example**: Offline invoice downloads.

#### 9. Why do we avoid using float types for duration calculations on the backend?
* **Answer**: Floating-point types cannot represent base-10 decimals exactly, resulting in rounding errors over time. We store durations in integer seconds to guarantee mathematical precision.
* **Why Interviewer Asks**: Precision is critical in financial and logging domains.
* **Common Mistakes**: Storing task durations as float hours (e.g. `1.33`).
* **Follow-up**: *How do we convert seconds to hours for billing?* By dividing by 3600 on read.
* **Production Example**: Time log database design.

#### 10. How do you design a schema to support invoice validation and adjustment histories?
* **Answer**: We create an `InvoiceAdjustment` table linked to the `Invoice` table, recording the modifier's ID, change description, previous amount, adjusted amount, and timestamp.
* **Why Interviewer Asks**: Essential for financial audit compliance.
* **Common Mistakes**: Mutating the main invoice total directly without keeping adjustment histories.
* **Follow-up**: *What is the relationship?* One-to-many: one invoice has many adjustments.
* **Production Example**: Audit-compliant billing systems.

#### 11. What is the difference between synchronous and asynchronous task date updates during dependency shifts?
* **Answer**: Synchronous updates calculate and write all shifted dates in the same transaction, blocking the client until complete. Asynchronous updates update the target task date instantly, offloading downstream dependency shifts to a background worker queue.
* **Why Interviewer Asks**: Explains latency optimization in complex calculations.
* **Common Mistakes**: Running recursive dependency updates synchronously for massive projects, resulting in API timeouts.
* **Follow-up**: *Which is preferred?* Asynchronous updates, keeping the API responsive.
* **Production Example**: Schedule calculations in project management tools.

#### 12. How do you handle print layout page count limitations?
* **Answer**: By configuring CSS rules like `page-break-before: always` on headers and sections, and setting max heights on table containers to ensure printed invoices fit cleanly on standard pages.
* **Why Interviewer Asks**: Poorly formatted print layouts can result in multi-page documents containing empty pages.
* **Common Mistakes**: Hardcoding fixed page counts, which fails as line items grow.
* **Follow-up**: *What property prevents text orphans?* `orphans: 3` and `widows: 3`.
* **Production Example**: Invoice print configuration.

#### 13. How do you design a database schema to support time log category tagging (e.g. Development, Design, QA)?
* **Answer**: We create a `TimeLogCategory` table and add a `categoryId` foreign key referencing it in the `TimeLog` table.
* **Why Interviewer Asks**: Tests category categorization design.
* **Common Mistakes**: Storing categories as plain text strings, which leads to typos and data inconsistencies.
* **Follow-up**: *How do you aggregate hours by category?* Using a `GROUP BY categoryId` query.
* **Production Example**: Time logs reporting.

#### 14. How do you optimize timeline grid renders to prevent UI lag on mobile devices?
* **Answer**: By reducing the column count (e.g. displaying a weekly grid instead of a monthly grid on mobile) and using standard CSS media queries to adjust layout structures.
* **Why Interviewer Asks**: Rendering a 31-column grid on mobile screens causes horizontal overflow and UI lag.
* **Common Mistakes**: Hardcoding the 31-day monthly grid for all device viewports.
* **Follow-up**: *What property handles grid scroll?* `overflow-x: auto`.
* **Production Example**: Responsive timeline layouts.

#### 15. Why do we run billing report aggregations on PostgreSQL instead of application servers?
* **Answer**: PostgreSQL is highly optimized for set operations and data aggregations. Running calculations on the database utilizes indexes and reduces the volume of data sent over the network, keeping the application server fast.
* **Why Interviewer Asks**: Tests performance optimization boundaries.
* **Common Mistakes**: Loading entire datasets to the application server memory to run loops.
* **Follow-up**: *What query compiles billing totals?* `SUM(durationSeconds)`.
* **Production Example**: Billing aggregations.

#### 16. How do you design a database schema to support custom invoice layouts per client?
* **Answer**: We create a `ClientInvoiceTemplate` table that stores custom branding options (logo, colors, headers). We link this template to the client record, applying the layout dynamically during rendering.
* **Why Interviewer Asks**: Tests custom configurations modeling.
* **Common Mistakes**: Hardcoding templates directly in the invoice renderer.
* **Follow-up**: *How do we store styling properties?* As JSON in a database column.
* **Production Example**: Dynamic invoice builders.

#### 17. How do you prevent race conditions when two users attempt to modify the same invoice line item?
* **Answer**: We use optimistic locking (version counters) or a Serializable transaction. If a conflict occurs, the second transaction fails, and the user is prompted to refresh.
* **Why Interviewer Asks**: Ensures billing data consistency in concurrent environments.
* **Common Mistakes**: Allowing concurrent updates to silently overwrite each other, corrupting ledger values.
* **Follow-up**: *What error does a version mismatch throw?* A database conflict exception.
* **Production Example**: Invoice editing controls.

#### 18. How do you design a schema to support billing credits and discount codes?
* **Answer**: We create a `DiscountCode` table and link it to the `Invoice` table. During billing calculations, we apply discounts as negative line items, keeping audit trails consistent.
* **Why Interviewer Asks**: Tests financial billing adjustments design.
* **Common Mistakes**: Storing discounts as simple rate adjustments on the main invoice record.
* **Follow-up**: *How do you validate expiry?* By verifying the active date is within the discount's validity range.
* **Production Example**: Invoicing engines.

#### 19. How do you prevent task dependency cycles in complex projects?
* **Answer**: Before saving a new dependency, we run a cycle detection query (such as a recursive CTE in SQL) to verify that adding the dependency will not create a circular loop. If a loop is detected, the transaction is rejected.
* **Why Interviewer Asks**: Cycle detection is critical for scheduling safety.
* **Common Mistakes**: Allowing cycle creation, which leads to infinite loops in scheduling updates.
* **Follow-up**: *What algorithm determines task execution order?* Topological Sort.
* **Production Example**: Dependency tracking.

#### 20. How do you design a billing system to support multiple tax rates based on client locations?
* **Answer**: We create a `TaxRule` table mapping countries/regions to tax rates. During invoice calculations, we look up the tax rate based on the client's address and apply it dynamically.
* **Why Interviewer Asks**: Essential for compliant international invoicing.
* **Common Mistakes**: Hardcoding tax rates in code templates.
* **Follow-up**: *How are changes to tax laws managed?* We version tax rules so historical invoices retain their original tax rates.
* **Production Example**: Compliant billing engines.

---

## 8. Resume-Based Questions

### Why did you build Swimlanes and Gantt Timelines from scratch instead of using Jira integrations?
* **Answer**: Jira integrations require third-party licensing and add network latency. By building these directly into TaskFlow, we keep all data within a single database, enabling real-time WebSockets synchronization and direct correlation with time logging and billing features.

### How did you verify the accuracy of invoice calculations?
* **Answer**: We wrote unit tests that verify calculations across varying rate and tax inputs, and integration tests that verify billing report aggregates match time logs saved in the database.

---

## 9. Code Review Questions

### What happens if `taskDue` is calculated in the previous month inside `TimelineView`?
* **Answer**: The task is filtered out because `taskDue < new Date(year, month, 1)` is true, preventing tasks from rendering in irrelevant month pages.

### Why do you cast `logs` to `any[]` in `getProjectBilling`?
* **Answer**: To bypass TypeScript compile errors when mapping over relational fields. Prisma Client compiles types without relations by default; casting to `any[]` ensures we can access `log.task.title` and `log.user.name` dynamically.

---

## 10. Production Readiness

### Database Auditing
* All time tracking changes (inserts, deletes) write audit records to the `ActivityLog` table to preserve history.

### Printing Optimization
* We compile and optimize invoice layouts before calling the print dialog to prevent browser freezing during high-volume document compiles.

---

## 11. Common Mistakes

* **Application-Only Calculations**: Computing billing totals in application memory instead of using database-side aggregations, degrading performance.
* **Neglecting Print Layouts**: Leaving navigation sidebars visible in printed PDF invoices.
* **Hardcoded Calendar Calculations**: Hardcoding 30 days for all months.

---

## 12. Cheat Sheet

* **Swimlane Drop format**: `cell-colId::laneKey` maps drop coordinates.
* **Month Length Formula**: `new Date(year, month + 1, 0).getDate()` returns total days.
* **Time Conversion**: Multiply hours by 3600 to store durations in seconds.

---

## 13. Mock Interview

### 1. How does the application handle stopwatch timers when the tab is closed?
* **Interviewer Expectations**: Session recovery design.
* **Ideal Answer**: The timer state is saved in localStorage. On reload, we read the saved start timestamp, calculate elapsed seconds, and resume the interval.

### 2. What happens if a user deletes a task that has active time logs?
* **Interviewer Expectations**: Integrity constraints verification.
* **Ideal Answer**: Prisma deletes the dependent time logs automatically because `onDelete: Cascade` is configured on the `TimeLog` model.

### 3. How do you optimize invoice calculations for massive datasets?
* **Interviewer Expectations**: Performance optimization.
* **Ideal Answer**: We compute aggregations on the database using SQL `SUM` and `GROUP BY` statements, returning summary rows to the client.

---

## 14. Summary

1. TaskFlow supports dynamic swimlanes grouped by priority or assignee.
2. The Gantt calendar visualizes task durations using CSS Grid.
3. Time logs are stored in integer seconds in the database.
4. Active stopwatches sync states to localStorage to prevent data loss.
5. Project billing compiles totals using single database queries.
6. Print-friendly CSS rules format clean invoices.
7. Workspace permissions protect access to billing dashboards.
8. Column drop coordinates are parsed from formatted drop cell IDs.
9. Deleting parents cascades to child time logs.
10. Dynamic invoice rates and tax rules support custom invoicing.
