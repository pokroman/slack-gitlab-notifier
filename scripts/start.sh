#!/bin/bash

# Скрипт запуска Slack-GitLab Notifier Bot

set -e

echo "🚀 Запуск Slack-GitLab Notifier Bot..."

# Проверка файла конфигурации
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "📋 Скопируйте .env.example в .env и заполните необходимые переменные"
    exit 1
fi

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    echo "📦 Установите Node.js 18+ для продолжения"
    exit 1
fi

# Проверка зависимостей
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

# Создание директорий
mkdir -p data logs

# Инициализация базы данных если она не существует
if [ ! -f "data/app.db" ]; then
    echo "🗄️  Инициализируем базу данных..."
    npm run setup-db
fi

# Запуск приложения
echo "⚡ Запускаем приложение..."
if [ "$NODE_ENV" = "production" ]; then
    npm start
else
    npm run dev
fi
