# 🚀 Quick Start

## Local Application Launch

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Initialization
```bash
npm run setup-db
```

### 3. Create .env File
Create `.env` file with minimal settings:
```bash
cat > .env << 'EOF'
SLACK_BOT_TOKEN=test-token
SLACK_SIGNING_SECRET=test-secret
SLACK_CLIENT_ID=test-client-id
SLACK_CLIENT_SECRET=test-client-secret
GITLAB_APPLICATION_ID=test-gitlab-id
GITLAB_APPLICATION_SECRET=test-gitlab-secret
GITLAB_INSTANCE_URL=https://gitlab.com
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_PATH=./data/app.db
WEBHOOK_SECRET=test-webhook-secret
EOF
```

### 4. Launch Application
```bash
# In development mode (with auto-reload)
npm run dev

# Or in normal mode
npm start
```

## 🧪 Endpoint Testing

After launch, the application will be available at `http://localhost:3000`

### Main Endpoints:

- **GET /** - application status
- **POST /webhook/gitlab** - webhook for GitLab
- **POST /slack/events** - events from Slack
- **GET /auth/gitlab/callback** - OAuth callback for GitLab

### Test Examples:

```bash
# Status check
curl http://localhost:3000

# Test GitLab webhook (without token - will get authorization error)
curl http://localhost:3000/webhook/gitlab -X POST -H "Content-Type: application/json" -d '{"test": "data"}'

# Test GitLab webhook with token
curl http://localhost:3000/webhook/gitlab -X POST -H "Content-Type: application/json" -H "x-gitlab-token: test-webhook-secret" -d '{"test": "data"}'

# Test Slack events (demo mode)
curl http://localhost:3000/slack/events -X POST -H "Content-Type: application/json" -d '{"test": "slack"}'
```

## 📋 Logs

The application outputs detailed logs to console:
- ✅ Successful operations (green checkmarks)
- ⚠️  Warnings (yellow triangles)  
- ❌ Errors (red crosses)
- 📨 Webhook events
- 🗄️  Database operations

## 🔧 Production Configuration

For production use, replace test values in `.env` with real ones:

1. **Slack App** - create application at https://api.slack.com/apps
2. **GitLab OAuth** - create application in Settings → Applications
3. **Domain** - replace `localhost` with your real domain
4. **Webhook Secret** - use strong random token

## 🛑 Stop Application

```bash
# Stop process on port 3000
lsof -ti:3000 | xargs kill -9

# Or simply Ctrl+C in terminal where application is running
```