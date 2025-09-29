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