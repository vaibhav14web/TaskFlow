# TaskFlow — Entity-Relationship Diagram

## 1. ER Diagram

```mermaid
erDiagram
    USER ||--o{ WORKSPACE_MEMBER : "has membership"
    WORKSPACE ||--o{ WORKSPACE_MEMBER : "has members"
    WORKSPACE ||--o{ PROJECT : "contains"
    PROJECT ||--|| BOARD : "has"
    BOARD ||--o{ COLUMN : "contains"
    COLUMN ||--o{ TASK : "contains"
    TASK ||--o{ TASK_ASSIGNEE : "assigned via"
    USER ||--o{ TASK_ASSIGNEE : "assigned to"
    TASK ||--o{ COMMENT : "has"
    USER ||--o{ COMMENT : "writes"
    TASK ||--o{ ACTIVITY_LOG : "records"
    USER ||--o{ ACTIVITY_LOG : "performs"
    TASK ||--o{ ATTACHMENT : "has"
    TASK ||--o{ CHECKLIST_ITEM : "has"
    USER ||--o{ NOTIFICATION : "receives"
    WORKSPACE ||--o{ PROJECT : "owns"

    USER {
        uuid id PK
        string name
        string email
        string password_hash
        string avatar_url
        timestamp created_at
    }

    WORKSPACE {
        uuid id PK
        string name
        uuid owner_id FK
        timestamp created_at
    }

    WORKSPACE_MEMBER {
        uuid workspace_id FK
        uuid user_id FK
        string role
        timestamp joined_at
    }

    PROJECT {
        uuid id PK
        uuid workspace_id FK
        string name
        string description
        string status
        timestamp created_at
    }

    BOARD {
        uuid id PK
        uuid project_id FK
    }

    COLUMN {
        uuid id PK
        uuid board_id FK
        string name
        int order
    }

    TASK {
        uuid id PK
        uuid column_id FK
        string title
        text description
        string priority
        date due_date
        int order
        timestamp created_at
    }

    TASK_ASSIGNEE {
        uuid task_id FK
        uuid user_id FK
    }

    COMMENT {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        text body
        timestamp created_at
    }

    ACTIVITY_LOG {
        uuid id PK
        uuid task_id FK
        uuid user_id FK
        string action
        timestamp created_at
    }

    ATTACHMENT {
        uuid id PK
        uuid task_id FK
        string file_url
        string file_name
        int file_size
        timestamp uploaded_at
    }

    CHECKLIST_ITEM {
        uuid id PK
        uuid task_id FK
        string label
        boolean is_done
        int order
    }

    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        string type
        json payload
        timestamp read_at
        timestamp created_at
    }
```

## 2. Relationship Notes

| Relationship | Cardinality | Notes |
|---|---|---|
| User ↔ Workspace | Many-to-many (via WORKSPACE_MEMBER) | A user can belong to multiple workspaces; a workspace has multiple members, each with a role |
| Workspace → Project | One-to-many | A project belongs to exactly one workspace |
| Project → Board | One-to-one | v1 supports a single board per project |
| Board → Column | One-to-many | Ordered via `order` field |
| Column → Task | One-to-many | Ordered via `order` field within column |
| Task ↔ User (assignee) | Many-to-many (via TASK_ASSIGNEE) | Supports multiple assignees per task |
| Task → Comment | One-to-many | Comments are not nested/threaded at the DB level in v1 (flat list ordered by created_at); UI may group visually |
| Task → Attachment | One-to-many | Files stored in S3-compatible storage; row stores metadata + URL |
| Task → Checklist Item | One-to-many | Simple ordered sub-items with boolean completion |
| Task → Activity Log | One-to-many | Append-only audit trail |
| User → Notification | One-to-many | Read/unread tracked via `read_at` nullable timestamp |

## 3. Indexing Recommendations
- `WORKSPACE_MEMBER(workspace_id, user_id)` — composite unique index (membership lookup + prevents duplicates)
- `TASK(column_id, order)` — supports fast ordered board rendering
- `COMMENT(task_id, created_at)` — supports fast thread loading
- `NOTIFICATION(user_id, read_at)` — supports fast "unread count" queries
- `PROJECT(workspace_id, status)` — supports fast active/archived filtering

## 4. Normalization Notes
Schema is normalized to 3NF. `TASK_ASSIGNEE` and `WORKSPACE_MEMBER` are junction tables resolving the two many-to-many relationships in the system (user↔task, user↔workspace). No denormalized counters are stored in v1; aggregate values (e.g., "3/5 checklist complete") are computed at read time — revisit if analytics query load requires materialized counts.
