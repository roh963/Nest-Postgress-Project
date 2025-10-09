#!/bin/bash
set -e
export PGPASSWORD=$POSTGRES_PASSWORD
BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi
psql -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pg_restore -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB $BACKUP_FILE
echo "Restored from $BACKUP_FILE"