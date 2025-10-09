#!/bin/bash
set -e
export PGPASSWORD=$POSTGRES_PASSWORD
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d%H%M%S).sql"
mkdir -p $BACKUP_DIR
pg_dump -h $DB_HOST -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"