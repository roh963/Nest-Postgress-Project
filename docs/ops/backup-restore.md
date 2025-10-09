# Backup and Restore

## Backup
- Command: `npm run db:backup`
- Output: `backups/backup-<timestamp>.sql`
- Uses `pg_dump` with `DB_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `.env`

## Restore
- Command: `npm run db:restore <backup-file>`
- Drops and recreates `public` schema, restores from backup
- Requires `DB_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

## Seed/Reset
- Seed: `npm run db:seed` (idempotent, upserts 2 users, 1000 feedbacks)
- Reset: `npm run db:reset` (drops DB, migrates, seeds)