# Database Indexes
## User Model
- @@unique([email]): Ensures unique emails and enables fast lookup for login/auth queries.
- @@index([role]): Speeds up filtering users by role (e.g., admin vs user queries).
## Feedback Model
- @@index([createdAt(sort: Desc)]): Optimizes sorting feedbacks by latest createdAt for pagination.
- @@index([userId]): Speeds up joins and filtering by userId (foreign key).
- @@index([email]): Enables fast filtering/search by email in Feedback queries.
### Why These Indexes?
These fields are used in WHERE, ORDER BY, and JOIN clauses in frequent queries (e.g., feedback lists, user lookups). Indexes reduce query time from O(n) to O(log n), avoiding full table scans.