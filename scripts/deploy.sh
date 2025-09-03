#!/bin/bash

# Script for deployment using Docker

set -e

echo "🚀 Deployment Slack-GitLab Notifier Bot..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed!"
    echo "📦 Install Docker to continue"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not installed!"
    echo "📦 Install Docker Compose to continue"
    exit 1
fi

# Check configuration file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "📋 Copy .env.example to .env and fill in the necessary variables"
    exit 1
fi

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p data logs

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Check status
echo "⏳ Waiting for services to start..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ Services successfully started!"
    
    # Show logs
    echo "📋 Latest logs:"
    docker-compose logs --tail=20
    
    echo ""
    echo "🌐 The application is available at http://localhost:3000"
    echo "📊 Container status: docker-compose ps"
    echo "📋 View logs: docker-compose logs -f"
    echo "🛑 Stop: docker-compose down"
else
    echo "❌ Error starting services!"
    echo "📋 Error logs:"
    docker-compose logs
    exit 1
fi
