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