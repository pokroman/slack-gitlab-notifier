#!/bin/bash

# Скрипт резервного копирования базы данных

set -e

BACKUP_DIR="./backups"
DB_PATH="./data/app.db"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/slack_gitlab_bot_$DATE.db"

echo "💾 Создание резервной копии базы данных..."

# Создание директории для резервных копий
mkdir -p "$BACKUP_DIR"

# Проверка существования базы данных
if [ ! -f "$DB_PATH" ]; then
    echo "❌ База данных не найдена: $DB_PATH"
    exit 1
fi

# Создание резервной копии
cp "$DB_PATH" "$BACKUP_FILE"

# Сжатие резервной копии
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

echo "✅ Резервная копия создана: $BACKUP_FILE"

# Удаление старых резервных копий (старше 30 дней)
find "$BACKUP_DIR" -name "slack_gitlab_bot_*.db.gz" -mtime +30 -delete

echo "🧹 Старые резервные копии очищены"

# Статистика
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/slack_gitlab_bot_*.db.gz 2>/dev/null | wc -l)

echo "📊 Размер резервной копии: $BACKUP_SIZE"
echo "📊 Всего резервных копий: $BACKUP_COUNT"
