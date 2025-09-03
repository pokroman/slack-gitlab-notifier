#!/bin/bash

# Script for installing Slack-GitLab Notifier Bot

set -e

echo "🚀 Installing Slack-GitLab Notifier Bot..."

# Check superuser privileges
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run with superuser privileges (sudo)" 
   exit 1
fi

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Create user for service
if ! id "nodejs" &>/dev/null; then
    echo "👤 Creating nodejs user..."
    useradd --system --no-create-home --shell /bin/false nodejs
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p /opt/slack-gitlab-bot
mkdir -p /opt/slack-gitlab-bot/data
mkdir -p /opt/slack-gitlab-bot/logs
mkdir -p /var/log/slack-gitlab-bot

# Copying files
echo "📋 Copying application files..."
cp -r ./* /opt/slack-gitlab-bot/
cd /opt/slack-gitlab-bot

# Installing dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Setting access permissions
echo "🔐 Setting access permissions..."
chown -R nodejs:nodejs /opt/slack-gitlab-bot
chown -R nodejs:nodejs /var/log/slack-gitlab-bot
chmod +x /opt/slack-gitlab-bot/scripts/*.sh

# Creating .env file if it doesn't exist
if [ ! -f "/opt/slack-gitlab-bot/.env" ]; then
    echo "⚙️  Creating configuration file..."
    cp /opt/slack-gitlab-bot/.env.example /opt/slack-gitlab-bot/.env
    chown nodejs:nodejs /opt/slack-gitlab-bot/.env
    chmod 600 /opt/slack-gitlab-bot/.env
    
    echo "❗ IMPORTANT: Edit the /opt/slack-gitlab-bot/.env file with your settings!"
fi

# Installing systemd service
echo "🔧 Installing systemd service..."
cp /opt/slack-gitlab-bot/slack-gitlab-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable slack-gitlab-bot

# Initializing database
echo "🗄️  Initializing database..."
sudo -u nodejs node /opt/slack-gitlab-bot/src/setup-database.js

echo "✅ Installation completed!"
echo ""
echo "📝 Next steps:"
echo "1. Edit the /opt/slack-gitlab-bot/.env file with your settings"
echo "2. Start the service: sudo systemctl start slack-gitlab-bot"
echo "3. Check the status: sudo systemctl status slack-gitlab-bot"
echo "4. View logs: sudo journalctl -u slack-gitlab-bot -f"
echo ""
echo "🌐 The application will be available on port 3000"
echo "📚 Documentation: https://github.com/your-repo/slack-gitlab-notifier"
