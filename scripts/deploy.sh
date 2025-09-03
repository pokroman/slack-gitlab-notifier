#!/bin/bash

# Скрипт развертывания с использованием Docker

set -e

echo "🚀 Развертывание Slack-GitLab Notifier Bot..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "📦 Установите Docker для продолжения"
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    echo "📦 Установите Docker Compose для продолжения"
    exit 1
fi

# Проверка файла конфигурации
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "📋 Скопируйте .env.example в .env и заполните необходимые переменные"
    exit 1
fi

# Создание директорий
echo "📁 Создаем необходимые директории..."
mkdir -p data logs

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down || true

# Сборка и запуск
echo "🔨 Сборка и запуск контейнеров..."
docker-compose up -d --build

# Проверка статуса
echo "⏳ Ожидание запуска сервисов..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ Сервисы успешно запущены!"
    
    # Показать логи
    echo "📋 Последние логи:"
    docker-compose logs --tail=20
    
    echo ""
    echo "🌐 Приложение доступно на http://localhost:3000"
    echo "📊 Статус контейнеров: docker-compose ps"
    echo "📋 Просмотр логов: docker-compose logs -f"
    echo "🛑 Остановка: docker-compose down"
else
    echo "❌ Ошибка при запуске сервисов!"
    echo "📋 Логи ошибок:"
    docker-compose logs
    exit 1
fi
