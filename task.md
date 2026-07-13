# Tasks - Task Board Extensions

- [x] Database Schema Migration
  - [x] Add `TimeLog` model to [schema.prisma](file:///c:/Users/vaibh/Projects/TaskFlow/backend/prisma/schema.prisma)
  - [x] Run Prisma migration dev script
- [x] Backend Implementation
  - [x] Create [time-log.controller.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/controllers/time-log.controller.ts)
  - [x] Create [time-log.routes.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/routes/time-log.routes.ts)
  - [x] Mount time log router in [app.ts](file:///c:/Users/vaibh/Projects/TaskFlow/backend/src/app.ts)
  - [x] Add backend integration tests in `tests/time-log.test.ts`
- [x] Frontend Implementation
  - [x] Update [api.ts](file:///c:/Users/vaibh/Projects/TaskFlow/frontend/src/api.ts) with TimeLog types and routes
  - [x] Implement Swimlane rendering and grouping logic in [BoardPage.tsx](file:///c:/Users/vaibh/Projects/TaskFlow/frontend/src/pages/BoardPage.tsx)
  - [x] Implement Task Details stopwatch and time logging in [TaskDetailDrawer.tsx](file:///c:/Users/vaibh/Projects/TaskFlow/frontend/src/components/TaskDetailDrawer.tsx)
  - [x] Implement Timeline View in [BoardPage.tsx](file:///c:/Users/vaibh/Projects/TaskFlow/frontend/src/pages/BoardPage.tsx)
  - [x] Implement Billing Dashboard & Invoice page
- [x] Verification
  - [x] Run backend tests successfully
  - [x] Build and verify frontend builds cleanly
