# Nest Postgres Starter

## Setup
1. Clone repo.
2. `npm install`
3. Copy `.env.example` to `.env` and fill vars.
4. `docker-compose up -d` (start Postgres).
5. `npx prisma migrate dev --name init`
6. `npm run start:dev`

## Env Vars
See `.env.example`.

## Scripts
- `npm run start:dev`: Dev server.
- `npm run build`: Build for prod.
- `npm run start:prod`: Prod server.
- `npm run prisma:migrate`: Apply migrations.
- `npm run prisma:studio`: DB browser.

## API Docs
`/docs` (Swagger).

## Docker
Postgres runs via docker-compose.

## Sample Calls
Use Postman collection: import `postman-collection.json`.
- GET /health
-GEt /docs

## Auth Flow
1. POST /auth/register → Create user.
2. POST /auth/login → Get access+refresh tokens.
3. Use access token in `Authorization: Bearer <token>` for protected routes.
4. On access expiry, POST /auth/refresh → New tokens.
5. POST /auth/logout → Revoke refresh.

## Pagination
GET /feedback?page=1&limit=10 → Returns `{ data, meta: { page, limit, total } }`.

## Cache
GET /feedback cached for 60s. Mutations clear cache.

## Swagger
/docs (use Bearer token for protected endpoints).

## Postman
Import postman-collection.json for auth, feedback flows.    


# Nest Postgres Starter

A starter NestJS project with:

- Google/GitHub OAuth + JWT
- Prisma with transactions & unique constraints
- Seed scripts for dev
- File uploads (Cloudinary/local)
- BullMQ queues & worker
- Docker Compose (Nest + Postgres + Redis + Worker)
- Swagger & Postman API documentation

---

# File Uploads & Queues

This module adds production-style **file handling**, **background jobs**, and a **one-command local stack** for NestJS + Postgres + Redis + Worker.

---

## 1. File Uploads Module

- **Endpoint:** `POST /files/upload`
- **Supported file types:** `png`, `jpg`, `pdf`
- **Max size:** 5MB
- **Storage Options:**
  - **Cloudinary (recommended)**
  - **Local disk (for dev/training only)**
- **DB Schema:** 
```ts
File {
  id: string;
  url: string;
  key: string;
  size: number;
  mimetype: string;
  uploadedBy: string; // User ID
  createdAt: Date;
}

## Logging
- Structured logging with Pino (JSON format).
- Request interceptor logs requestId, method, path, duration.
- Sensitive fields masked (e.g., authorization headers, passwords).
- Setup: Pino configured in AppModule, logger used globally.

## Tracing and Metrics
- OpenTelemetry for traces (HTTP, Prisma instrumented).
- Traces exported to console.
- Metrics exported to /metrics (Prometheus).
- Setup: OTel SDK in main.ts, auto-instrumentations for HTTP/Prisma.
- Track: Requests per route, durations, active sockets (optional queue lag).
- Access metrics: curl http://localhost:3000/metrics

## Rate Limiting
- Global limit: 10 requests/60s.
- Overrides: /auth (5 requests/60s), /files/upload (10 requests/60s).
- Setup: ThrottlerModule in AppModule, ThrottlerGuard as global guard, @Throttle on routes.

## Deployment Guide

### Required Envs (.env.prod)
- POSTGRES_PASSWORD=strongpass (match DATABASE_URL)
- JWT_SECRET=...
- All OAuth/Cloudinary secrets (see .env.example)

### CI/CD Flow
PR → CI (lint/test/e2e) → Main push → CD (build/push GHCR) → Smoke Tests → SSH Deploy EC2 → Migrations Auto → Live URL!

Diagram: [Simple text: GitHub → GHCR Image → EC2 Docker Compose Up → URL Ready]

### Rollback Steps
1. Old commit SHAcopy (GH repo commits tab se).
2. EC2 SSH: `cd ~/Nest-Postgress-Project && ./deploy.sh <old-sha>`
3. Verify: `curl http://13.60.181.126/v1/health` + manual smoke.
Example: `./deploy.sh abc123def456`

### Staging vs Prod
- Staging: Separate EC2/.env.staging, URL=staging.13.60.181.126
- Prod: HTTPS + strong secrets, /metrics/docs IP whitelist (nginx.conf me 49.43.4.43)

Security: Secrets GH Actions me only. Worker Redis retry code add if needed.

## Deployment Guide

### Required Envs (.env.prod)
- POSTGRES_PASSWORD=strongpass (match DATABASE_URL)
- JWT_SECRET=...
- All OAuth/Cloudinary secrets (see .env.example)

### CI/CD Flow
PR → CI (lint/test/e2e) → Main push → CD (build/push GHCR) → Smoke Tests → SSH Deploy EC2 → Migrations Auto → Live URL!

Diagram: [Simple text: GitHub → GHCR Image → EC2 Docker Compose Up → URL Ready]

### Rollback Steps
1. Old commit SHAcopy (GH repo commits tab se).
2. EC2 SSH: `cd ~/Nest-Postgress-Project && ./deploy.sh <old-sha>`
3. Verify: `curl http://13.60.181.126/v1/health` + manual smoke.
Example: `./deploy.sh abc123def456`

### Staging vs Prod
- Staging: Separate EC2/.env.staging, URL=staging.13.60.181.126
- Prod: HTTPS + strong secrets, /metrics/docs IP whitelist (nginx.conf me 49.43.4.43)

Security: Secrets GH Actions me only. Worker Redis retry code add if needed.


## Environment Variables
| Variable                 | Description                                      | Default/Example                                      |
|--------------------------|--------------------------------------------------|----------------------------------------------------|
| NODE_ENV                | Environment (development, production, test)       | development                                        |
| PORT                    | Application port                                 | 3000                                               |
| CORS_ORIGINS            | Comma-separated allowed CORS origins             | http://localhost:3000,https://example.com          |
| THROTTLE_TTL            | Rate limit TTL (seconds)                         | 60                                                 |
| THROTTLE_LIMIT          | Default rate limit (requests per TTL)            | 10                                                 |
| REDIS_URL               | Redis connection URL                             | redis://localhost:6379                             |
| DATABASE_URL            | PostgreSQL connection URL                        | postgresql://postgres:postgres@localhost:5432/postgres |
| POSTGRES_USER           | PostgreSQL user                                  | postgres                                           |
| POSTGRES_PASSWORD       | PostgreSQL password                              | postgres                                           |
| POSTGRES_DB             | PostgreSQL database name                         | postgres                                           |
| JWT_SECRET              | JWT signing secret                               | <random-string>                                    |
| JWT_REFRESH_SECRET      | JWT refresh token secret                         | <random-string>                                    |
| ACCESS_TOKEN_TTL_MIN    | Access token TTL (minutes)                       | 15                                                 |
| REFRESH_TOKEN_TTL_DAYS  | Refresh token TTL (days)                         | 7                                                  |
| GOOGLE_CLIENT_ID        | Google OAuth client ID                           | <client-id>                                        |
| GOOGLE_CLIENT_SECRET    | Google OAuth client secret                       | <client-secret>                                    |
| GOOGLE_CALLBACK_URL     | Google OAuth callback URL                        | http://localhost:3000/auth/google/callback         |
| GITHUB_CLIENT_ID        | GitHub OAuth client ID                           | <client-id>                                        |
| GITHUB_CLIENT_SECRET    | GitHub OAuth client secret                       | <client-secret>                                    |
| GITHUB_CALLBACK_URL     | GitHub OAuth callback URL                        | http://localhost:3000/auth/github/callback         |
| OAUTH_CALLBACK_BASE     | OAuth callback base URL                          | http://localhost:3000                              |
| CLOUDINARY_CLOUD_NAME   | Cloudinary cloud name                            | <cloud-name>                                       |
| CLOUDINARY_API_KEY      | Cloudinary API key                               | <api-key>                                          |
| CLOUDINARY_API_SECRET   | Cloudinary API secret                            | <api-secret>                                       |
| WEBHOOK_URL_SLACK       | Slack/Discord webhook URL                        | <webhook-url>                                      |
| GHCR_TOKEN              | GitHub Container Registry token                  | <token>                                            |
| MAX_JSON_SIZE           | Max JSON payload size                            | 2mb                                                |