#!/bin/bash

# Скрипт запуска Slack-GitLab Notifier Bot

set -e

echo "🚀 Starting Slack-GitLab Notifier Bot..."

# Check configuration file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Copy .env.example to .env and fill in the necessary variables"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed!"
    echo "📦 Install Node.js 18+ to continue"
    exit 1
fi

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create directories
mkdir -p data logs

# Initializing database if it doesn't exist
if [ ! -f "data/app.db" ]; then
    echo "🗄️  Initializing database..."
    npm run setup-db
fi

# Start application
echo "⚡ Starting application..."
if [ "$NODE_ENV" = "production" ]; then
    npm start
else
    npm run dev
fi
