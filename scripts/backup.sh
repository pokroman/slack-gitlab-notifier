#!/bin/bash

# Script for database backup

set -e

BACKUP_DIR="./backups"
DB_PATH="./data/app.db"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/slack_gitlab_bot_$DATE.db"

echo "💾 Creating database backup..."

# Create directory for backups
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found: $DB_PATH"
    exit 1
fi

# Create backup
cp "$DB_PATH" "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

echo "✅ Database backup created: $BACKUP_FILE"

# Delete old backups (older than 30 days)
find "$BACKUP_DIR" -name "slack_gitlab_bot_*.db.gz" -mtime +30 -delete

echo "🧹 Old backups cleared"

# Statistics
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/slack_gitlab_bot_*.db.gz 2>/dev/null | wc -l)

echo "📊 Backup size: $BACKUP_SIZE"
echo "📊 Total backups: $BACKUP_COUNT"
