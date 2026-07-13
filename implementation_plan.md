# Implementation Plan - Task Board Extensions

We propose implementing a set of three advanced extensions for the TaskFlow project board:
1. **Swimlanes**: Group tasks horizontally by **Priority** or **Assignee** directly on the Kanban board with interactive drag-and-drop support across cells.
2. **Time Tracking & Billing**: Track task hours with an interactive stopwatch and manual logging, coupled with a Project Billing & Invoice Generator.
3. **Timeline / Gantt View**: A horizontal calendar schedule view visualizing task duration from creation to due date.

---

## Proposed Database Changes

### `schema.prisma`
We will add a `TimeLog` model to track work hours against tasks:

```prisma
model TimeLog {
  id              String   @id @default(uuid())
  taskId          String
  task            Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  durationSeconds Int
  description     String?
  loggedAt        DateTime @default(now())

  @@map("time_logs")
}
```

* Update `User` and `Task` models to include `timeLogs TimeLog[]`.

---

## Proposed Backend Changes

### 1. Time Log Routes & Controller
* [NEW] [time-log.controller.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/controllers/time-log.controller.ts):
  * `createTimeLog`: Validates duration and description, creates a log.
  * `listTimeLogs`: Lists logs for a task.
  * `deleteTimeLog`: Deletes a log if it belongs to the current user or project admin/owner.
  * `getProjectBilling`: Aggregates logged time for all tasks under a project, grouped by assignee and task, estimating costs based on a provided base rate.
* [NEW] [time-log.routes.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/routes/time-log.routes.ts):
  * Define paths under `/api/v1/tasks/:taskId/time-logs` and `/api/v1/projects/:projectId/billing`.

---

## Proposed Frontend Changes

### 1. Board Extensions Header
* Update [BoardPage.tsx](file:///c:/Users/vaibh/Projects/TaskFlow/frontend/src/pages/BoardPage.tsx) topbar to introduce view options:
  * **Kanban Board** | **Timeline** | **Billing & Invoices**

### 2. Kanban Swimlanes
* Introduce a "Group By" selector (Options: `None` | `Assignee` | `Priority`).
* Implement Swimlane row rendering for `Assignee` and `Priority`.
* Support cross-swimlane drag-and-drop:
  * Drop targets named `${column.id}::${swimlaneKey}`.
  * Dropping across Priority rows updates task priority.
  * Dropping across Assignee rows updates task assignment.

### 3. Timeline / Gantt View
* A calendar grid displaying task durations (stretching from task creation date to `dueDate`).
* Includes styling, priority color accents, and full details modal overlay on click.

### 4. Time Tracking & Billing UI
* **Task details time log**:
  * Live Stopwatch (Start / Stop) with description prompt on save.
  * Manual log form.
  * Time history list.
* **Billing Dashboard**:
  * Visual summaries of total hours logged.
  * Customizable Invoice Form (Client Name, Hourly Rate, Tax Rate).
  * Interactive print-friendly Invoice template with local print trigger.

---

## Verification Plan

### Automated Tests
* Create unit/integration tests for the time-logging backend API inside `tests/time-log.test.ts`.
* Run test suite using `npm test`.

### Manual Verification
* Run local servers and open the browser subagent to verify Swimlanes group selections, Drag-and-Drop priority updates, Stopwatch timer logs, and Billing Invoice rendering.
