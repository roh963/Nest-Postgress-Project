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

