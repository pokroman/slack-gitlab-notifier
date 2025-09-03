# Slack-GitLab Notifier Bot

Slack bot for receiving notifications from GitLab about Merge Requests and mentions in comments.

## 🚀 Features

- 📬 Notifications about new Merge Requests where you are assigned as executor or reviewer
- 💬 Notifications about mentions (@username) in MR comments
- 🔐 Secure OAuth authorization with GitLab
- 📊 Storage of connections between Slack and GitLab accounts
- 🛡️ Webhook token verification for security

## 📋 Requirements

- Node.js 16+
- GitLab account (gitlab.com or self-hosted)
- Slack workspace with permissions to create applications

## ⚙️ Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd slack-gitlab-notifier
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Configure environment variables in .env file**

## 🔧 Configuration

### 1. Creating Slack Application

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Specify application name and select workspace
4. In "OAuth & Permissions" section:
   - Add Redirect URL: `https://yourdomain.com/auth/gitlab/callback`
   - Add Bot Token Scopes:
     - `chat:write`
     - `commands`
     - `users:read`
5. In "Slash Commands" section create commands:
   - `/gitlab-connect` - connect GitLab account
   - `/gitlab-status` - check connection status
   - `/gitlab-disconnect` - disconnect account
6. Copy Bot User OAuth Token and Signing Secret to .env

### 2. Creating GitLab OAuth Application

1. Go to Settings → Applications in your GitLab
2. Create new application:
   - Name: "Slack Notifier"
   - Redirect URI: `https://yourdomain.com/auth/gitlab/callback`
   - Scopes: `read_user`, `read_api`
3. Copy Application ID and Secret to .env

### 3. Environment Variables Configuration

Fill the .env file:

```env
# Slack App settings
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# GitLab OAuth settings  
GITLAB_APPLICATION_ID=your-gitlab-app-id
GITLAB_APPLICATION_SECRET=your-gitlab-app-secret
GITLAB_INSTANCE_URL=https://gitlab.com

# Application settings
PORT=3000
NODE_ENV=production
APP_URL=https://yourdomain.com

# Database
DATABASE_PATH=./data/app.db

# Webhook secret for security
WEBHOOK_SECRET=your-webhook-secret
```

## 🏃‍♂️ Running

1. **Database initialization:**
```bash
npm run setup-db
```

2. **Run in development mode:**
```bash
npm run dev
```

3. **Run in production:**
```bash
npm start
```

## 🔗 GitLab Webhooks Configuration

1. Go to Settings → Webhooks in your GitLab project
2. Add webhook:
   - URL: `https://yourdomain.com/webhook/gitlab`
   - Secret Token: value from WEBHOOK_SECRET
   - Triggers: select "Merge request events" and "Comments"
3. Click "Add webhook"

## 🎮 Usage

### Slack Commands

- `/gitlab-connect` - connect GitLab account
- `/gitlab-status` - check connection status
- `/gitlab-disconnect` - disconnect GitLab account

### Automatic Notifications

The bot will send notifications in the following cases:

1. **Merge Request events:**
   - You are assigned as executor (assignee)
   - You are assigned as reviewer
   - MR is opened, closed, updated or merged

2. **Mentions in comments:**
   - Someone mentioned you (@username) in MR comment

## 🗄️ Database Structure

### users table
- `slack_user_id` - Slack user ID
- `slack_team_id` - Slack team ID  
- `gitlab_user_id` - GitLab user ID
- `gitlab_username` - GitLab username
- `gitlab_email` - GitLab email
- `gitlab_token` - OAuth token for GitLab API

### notifications table
- Logs of sent notifications

### webhook_logs table
- Logs of processed webhooks

## 🐛 Debugging

1. **Check logs:**
```bash
# In development mode logs are printed to console
npm run dev

# In production you can redirect to file
npm start > logs/app.log 2>&1
```

2. **Check webhooks:**
   - Make sure URL is accessible from internet
   - Check Secret Token correctness
   - Look at logs in GitLab Settings → Webhooks

3. **Check OAuth:**
   - Make sure Redirect URI is correct
   - Check Application ID and Secret

## 🔧 Deployment

### Docker (recommended)

Create Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env ./

EXPOSE 3000

CMD ["npm", "start"]
```

### Systemd Service

Create `/etc/systemd/system/slack-gitlab-bot.service`:

```ini
[Unit]
Description=Slack GitLab Notifier Bot
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/slack-gitlab-bot
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make commit with changes
4. Create Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## ❓ Support

If you have questions or issues:

1. Check [Issues](https://github.com/your-repo/issues)
2. Create new Issue with detailed problem description
3. Attach logs and configuration (without secret keys!)

---

**Enjoy using! 🚀**