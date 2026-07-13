# TaskFlow — User Stories

Format: **As a** [role], **I want** [action], **so that** [benefit].
Each story includes acceptance criteria and maps to a persona from the Personas document.

---

## Epic 1: Authentication & Accounts

**US-1.1** — As a new user, I want to sign up with my email and password, so that I can create an account.
- *AC:* Verification email sent; account inactive until verified; password meets minimum strength rules.

**US-1.2** — As a returning user, I want to log in with Google, so that I don't need to remember another password.
- *AC:* Google OAuth flow completes and creates/links an account; user lands on their workspace list.

**US-1.3** — As a user, I want to reset my password if I forget it, so that I'm not locked out of my account.
- *AC:* Reset link expires after a set time; old password invalidated once reset.

---

## Epic 2: Workspaces & Projects

**US-2.1** — As Alicia (freelancer), I want to create separate workspaces per client, so that each client's work stays isolated.
- *AC:* Creating a workspace makes the creator its Owner; workspaces are not visible to non-members.

**US-2.2** — As Marcus (club lead), I want to invite members via a shareable link, so that I don't have to add each person manually.
- *AC:* Link has an expiry/usage limit option; new members join with a default role (Member).

**US-2.3** — As an Admin, I want to archive a completed project, so that it no longer clutters the active project list but stays accessible for reference.
- *AC:* Archived projects are hidden from default view, filterable via an "Archived" toggle.

---

## Epic 3: Kanban Board

**US-3.1** — As Jordan (engineer), I want to drag a task card from "In Progress" to "In Review," so that the board reflects real status without extra clicks.
- *AC:* Move persists immediately; visible to other users in real time (see Epic 6).

**US-3.2** — As Marcus, I want to add a custom column ("Blocked"), so that the board matches how our club actually works.
- *AC:* New column appears at chosen position; existing cards unaffected.

**US-3.3** — As Priya, I want to filter the board to show only tasks assigned to me, so that I can focus on my own work.
- *AC:* Filter applies instantly and persists for the session.

---

## Epic 4: Roles & Permissions

**US-4.1** — As an Admin, I want to assign roles to members, so that only trusted people can restructure the project.
- *AC:* Role change takes effect immediately; affected user's UI updates permissions on next action.

**US-4.2** — As Alicia, I want to invite a client as a Viewer, so that they can see progress without being able to edit anything.
- *AC:* Viewer role blocked from all create/edit/delete/comment actions at the API level, not just hidden in UI.

**US-4.3** — As a Member, I want to be prevented from deleting the whole project, so that I can't accidentally break things for the team.
- *AC:* Delete-project action is not exposed to Member/Viewer roles and rejected server-side if attempted directly.

---

## Epic 5: Tasks & Assignment

**US-5.1** — As Marcus, I want to assign a task to a specific member with a due date, so that ownership and deadlines are clear.
- *AC:* Assignee receives a notification; task shows assignee avatar and due date on the card.

**US-5.2** — As Jordan, I want to break a task into a checklist of sub-items, so that I can track partial progress.
- *AC:* Checklist items can be checked independently; parent task shows "3/5 complete."

**US-5.3** — As Priya, I want to attach a file to a task, so that relevant materials live with the work itself.
- *AC:* Attachment uploads and is downloadable by any workspace member with view access.

**US-5.4** — As an assignee, I want to be notified 24 hours before a task's due date, so that I don't miss deadlines.
- *AC:* Notification fires once per due date, visible in the in-app notification center.

---

## Epic 6: Comments & Collaboration

**US-6.1** — As Jordan, I want to comment on a task and @mention a teammate, so that they're pulled into the discussion.
- *AC:* Mentioned user gets a notification linking directly to the comment.

**US-6.2** — As a user, I want to edit or delete my own comment, so that I can correct mistakes.
- *AC:* Edit history not required for v1; deleted comments removed from view for all users.

---

## Epic 7: Real-Time Collaboration

**US-7.1** — As Jordan, I want to see a teammate's card move update on my screen without refreshing, so that the board always reflects reality.
- *AC:* Update appears within 1 second for all connected clients in the same project.

**US-7.2** — As a user, I want to see who else is currently viewing a task, so that I know if someone else is already handling it.
- *AC:* Presence indicator (avatar/dot) shown on the task detail view.

---

## Epic 8: Analytics

**US-8.1** — As Marcus, I want to see a breakdown of tasks by status across all our club's projects, so that I can spot bottlenecks.
- *AC:* Dashboard aggregates task counts by status, updates as data changes.

**US-8.2** — As Marcus, I want to see which members are overloaded, so that I can redistribute work fairly.
- *AC:* Per-member open-task count displayed, sortable.

**US-8.3** — As an Admin, I want to see a trend of tasks completed over time, so that I can tell if the team's pace is improving.
- *AC:* Timeline chart with a selectable date range (e.g., last 7/30/90 days).

---

## Story Prioritization Summary

| Epic | Priority | Depends On |
|---|---|---|
| 1. Auth & Accounts | P0 | — |
| 2. Workspaces & Projects | P0 | Epic 1 |
| 3. Kanban Board | P0 | Epic 2 |
| 4. Roles & Permissions | P0 | Epic 2 |
| 5. Tasks & Assignment | P0 | Epic 3, 4 |
| 6. Comments & Collaboration | P1 | Epic 5 |
| 7. Real-Time Collaboration | P1 | Epic 3, 5 |
| 8. Analytics | P1 | Epic 5 |
