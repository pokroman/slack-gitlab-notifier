# 🚀 IS-Hosting Setup

## Step-by-step Guide for IS-Hosting VPS

### Step 1: Server Connection
```bash
# SSH connection (replace with your IP)
ssh root@YOUR_SERVER_IP

# Change password on first connection
passwd
```

### Step 2: System Update
```bash
# Update packages
apt update && apt upgrade -y

# Install necessary packages
apt install -y curl wget git nano htop ufw
```

### Step 3: Docker Installation
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Check installation
docker --version
docker-compose --version
```

### Step 4: Firewall Configuration
```bash
# Basic UFW setup
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Check status
ufw status
```

### Step 5: Create Application User
```bash
# Create nodejs user
useradd --system --no-create-home --shell /bin/false nodejs

# Create application directory
mkdir -p /opt/slack-gitlab-bot
cd /opt/slack-gitlab-bot
```

### Step 6: Repository Cloning
```bash
# Clone your repository (replace with your URL)
git clone https://github.com/YOUR_USERNAME/slack-gitlab-notifier.git .

# Check files
ls -la
```

### Step 7: Environment Variables Setup
```bash
# Create .env file
nano .env

# Insert the following content (replace with your real values):
```

```env
# Real Slack tokens
SLACK_BOT_TOKEN=xoxb-your-real-bot-token
SLACK_SIGNING_SECRET=your-real-signing-secret
SLACK_CLIENT_ID=your-real-client-id
SLACK_CLIENT_SECRET=your-real-client-secret

# Real GitLab data
GITLAB_APPLICATION_ID=your-real-gitlab-app-id
GITLAB_APPLICATION_SECRET=your-real-gitlab-app-secret
GITLAB_INSTANCE_URL=https://gitlab.com

# Server settings
PORT=3000
NODE_ENV=production
APP_URL=https://your-domain.com
# Or use IP: APP_URL=http://YOUR_SERVER_IP:3000

# Database
DATABASE_PATH=./data/app.db

# Security
WEBHOOK_SECRET=your-strong-random-secret-here
```

```bash
# Save: Ctrl+X, Y, Enter

# Set permissions
chmod 600 .env
chown nodejs:nodejs .env
```

### Step 8: Application Launch
```bash
# Launch via Docker Compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Step 9: Nginx Configuration (optional)
```bash
# Install nginx
apt install -y nginx

# Create configuration
nano /etc/nginx/sites-available/slack-gitlab-bot
```

Insert configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activate configuration
ln -s /etc/nginx/sites-available/slack-gitlab-bot /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site

# Check configuration
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx
```

### Step 10: SSL Certificate (if you have domain)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d your-domain.com

# Automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## ✅ Work Verification

### API Testing
```bash
# Check main endpoint
curl http://YOUR_SERVER_IP:3000
# Or with domain:
curl https://your-domain.com

# Should return:
# {"message":"Slack-GitLab Notifier Bot","status":"running","version":"1.0.0"}
```

### Log Check
```bash
# Docker container logs
docker-compose logs slack-gitlab-bot

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🔧 Maintenance

### Application Update
```bash
cd /opt/slack-gitlab-bot

# Stop service
docker-compose down

# Update code
git pull origin main

# Launch
docker-compose up -d
```

### Database Backup
```bash
# Manual backup
./scripts/backup.sh

# Automatic backup (every day at 2:00)
echo "0 2 * * * cd /opt/slack-gitlab-bot && ./scripts/backup.sh" | crontab -
```

### Monitoring
```bash
# Container status
docker-compose ps

# Resource usage
htop

# Disk space
df -h
```

## 🆘 Troubleshooting

### Connection Issues
```bash
# Check ports
netstat -tlnp | grep :3000
netstat -tlnp | grep :80

# Check firewall
ufw status verbose
```

### Docker Issues
```bash
# Restart Docker
systemctl restart docker

# Clean unused images
docker system prune -a
```

### SSL Issues
```bash
# Check certificate
certbot certificates

# Force renewal
certbot renew --force-renewal
```

---

**After completing all steps, your bot will work on IS-Hosting! 🎉**

**URLs for Slack and GitLab configuration:**
- Without domain: `http://YOUR_SERVER_IP:3000`
- With domain: `https://your-domain.com`