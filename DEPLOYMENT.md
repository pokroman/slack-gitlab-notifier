# 🚀 Deployment Guide

## Hosting Options

### 🎯 **Recommended options:**

1. **VPS/VDS server** (DigitalOcean, Linode, Hetzner) - from $5/month
2. **Cloud platforms** (Railway, Render, Heroku)
3. **Own server** (if you have static IP)

## 📋 Step-by-step Deployment

### **Option 1: VPS with Docker (Recommended)**

#### Step 1: Server Preparation
```bash
# Connect to server
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/slack-gitlab-bot
cd /opt/slack-gitlab-bot
```

#### Step 2: Repository Cloning
```bash
git clone https://github.com/YOUR_USERNAME/slack-gitlab-notifier.git .
```

#### Step 3: Environment Setup
```bash
# Create .env file
cat > .env << 'EOF'
SLACK_BOT_TOKEN=xoxb-your-real-token
SLACK_SIGNING_SECRET=your-real-signing-secret
SLACK_CLIENT_ID=your-real-client-id
SLACK_CLIENT_SECRET=your-real-client-secret
GITLAB_APPLICATION_ID=your-real-gitlab-id
GITLAB_APPLICATION_SECRET=your-real-gitlab-secret
GITLAB_INSTANCE_URL=https://gitlab.com
PORT=3000
NODE_ENV=production
APP_URL=https://your-domain.com
DATABASE_PATH=./data/app.db
WEBHOOK_SECRET=your-strong-random-secret
EOF

# Set permissions
chmod 600 .env
```

#### Step 4: Application Launch
```bash
docker-compose up -d
```

#### Step 5: Nginx Configuration (optional)
```bash
# Install nginx
apt update && apt install nginx

# Copy configuration
cp config/nginx.conf /etc/nginx/sites-available/slack-gitlab-bot
ln -s /etc/nginx/sites-available/slack-gitlab-bot /etc/nginx/sites-enabled/

# Edit configuration
nano /etc/nginx/sites-available/slack-gitlab-bot
# Replace your-domain.com with your domain

# Get SSL certificate
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com

# Restart nginx
systemctl restart nginx
```

### **Option 2: Railway (Simple)**

1. **Register at** [Railway.app](https://railway.app)
2. **Connect GitHub repository**
3. **Set environment variables:**
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-secret
   GITLAB_APPLICATION_ID=your-id
   GITLAB_APPLICATION_SECRET=your-secret
   PORT=3000
   NODE_ENV=production
   ```
4. **Railway will automatically deploy the application**

### **Option 3: Render (Free tier)**

1. **Register at** [Render.com](https://render.com)
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Settings:**
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Set environment variables**

## 🔧 Automatic Deployment Configuration

### GitHub Secrets

In your GitHub repository settings add secrets:

**For SSH deployment:**
- `HOST` - server IP address
- `USERNAME` - username (usually root)
- `SSH_KEY` - private SSH key
- `PORT` - SSH port (usually 22)

**Application tokens:**
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `GITLAB_APPLICATION_ID`
- `GITLAB_APPLICATION_SECRET`
- `GITLAB_INSTANCE_URL`
- `APP_URL`
- `WEBHOOK_SECRET`

### Automatic Deployment

After configuring GitHub Actions, each push to main branch will:
1. ✅ Run tests
2. 🏗️ Build Docker image
3. 🚀 Deploy to server
4. ✅ Check status

## 🔗 URL Configuration in Applications

### Slack App Settings
Replace localhost with your domain:
- **Request URL**: `https://your-domain.com/slack/events`
- **OAuth Redirect URL**: `https://your-domain.com/auth/gitlab/callback`

### GitLab OAuth Application
- **Redirect URI**: `https://your-domain.com/auth/gitlab/callback`

### GitLab Webhooks
In each project add webhook:
- **URL**: `https://your-domain.com/webhook/gitlab`
- **Secret Token**: WEBHOOK_SECRET value
- **Events**: Merge request events, Comments

## 📊 Monitoring

### Status Check
```bash
# Docker
docker-compose ps
docker-compose logs -f

# Systemd
sudo systemctl status slack-gitlab-bot
sudo journalctl -u slack-gitlab-bot -f

# API test
curl https://your-domain.com
```

### Application Logs
```bash
# Docker
docker-compose logs slack-gitlab-bot

# Log files
tail -f /opt/slack-gitlab-bot/logs/app.log
```

## 🔒 Security

1. **Firewall settings:**
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

2. **Regular updates:**
```bash
# Automatic system updates
apt install unattended-upgrades
```

3. **Database backup:**
```bash
# Setup cron for daily backup
0 2 * * * cd /opt/slack-gitlab-bot && ./scripts/backup.sh
```

## 🆘 Troubleshooting

### Common Issues:

**Application won't start:**
```bash
docker-compose logs
# Check .env file and environment variables
```

**Webhook not working:**
- Check URL accessibility from outside
- Check WEBHOOK_SECRET
- Check logs: `docker-compose logs | grep webhook`

**OAuth not working:**
- Check Redirect URI in GitLab and Slack
- Check APP_URL in .env

**Database not accessible:**
```bash
docker-compose exec slack-gitlab-bot ls -la data/
# Check data/ directory permissions
```

---

**Done! Your bot will work 24/7 and automatically update when code changes.** 🎉