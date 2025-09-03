require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const Database = require('./database');
const GitLabWebhook = require('./gitlab-webhook');
const AuthService = require('./auth-service');
const NotificationService = require('./notification-service');

// Initialize Slack application
let slackApp;
try {
  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: false, // use HTTP mode for webhooks
  });
} catch (error) {
  console.warn('⚠️  Slack App not initialized (possibly invalid tokens):', error.message);
  // Create stub for demonstration
  slackApp = {
    command: () => {},
    client: {
      chat: {
        postMessage: async () => console.log('📨 [DEMO] Message sent to Slack')
      }
    }
  };
}

// Initialize Express server
const expressApp = express();
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Initialize services
const database = new Database();
const authService = new AuthService(database);
const notificationService = new NotificationService(slackApp, database);
const gitlabWebhook = new GitLabWebhook(database, notificationService);

// Slack commands and events
slackApp.command('/gitlab-connect', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    const authUrl = authService.generateAuthUrl(command.user_id, command.team_id);
    
    await respond({
      response_type: 'ephemeral',
      text: 'Connect your GitLab account',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔗 *Connect to GitLab*\n\nTo receive notifications about Merge Requests and mentions from GitLab, connect your account:'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Connect GitLab'
              },
              url: authUrl,
              style: 'primary'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error creating authorization link:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ An error occurred while creating the connection link. Please try again later.'
    });
  }
});

slackApp.command('/gitlab-status', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const user = await database.getUser(command.user_id, command.team_id);
    
    if (user && user.gitlab_token) {
      await respond({
        response_type: 'ephemeral',
        text: `✅ Your GitLab account is connected!\n📧 GitLab email: ${user.gitlab_email}\n🆔 GitLab ID: ${user.gitlab_user_id}`
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: '❌ GitLab account is not connected. Use `/gitlab-connect` to connect.'
      });
    }
  } catch (error) {
    console.error('Error checking status:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ An error occurred while checking connection status.'
    });
  }
});

slackApp.command('/gitlab-disconnect', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    await database.removeUser(command.user_id, command.team_id);
    await respond({
      response_type: 'ephemeral',
      text: '✅ GitLab account successfully disconnected from Slack.'
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ An error occurred while disconnecting the account.'
    });
  }
});

// Express routes
expressApp.get('/', (req, res) => {
  res.json({ 
    message: 'Slack-GitLab Notifier Bot',
    status: 'running',
    version: '1.0.0'
  });
});

// Route for OAuth callback from GitLab
expressApp.get('/auth/gitlab/callback', authService.handleCallback.bind(authService));

// Route for receiving webhooks from GitLab
expressApp.post('/webhook/gitlab', gitlabWebhook.handleWebhook.bind(gitlabWebhook));

// Slack events (handler for Slack App)
if (slackApp.receiver && slackApp.receiver.router) {
  expressApp.use('/slack/events', slackApp.receiver.router);
} else {
  // Stub for local testing without configured Slack tokens
  expressApp.post('/slack/events', (req, res) => {
    res.status(200).json({ message: 'Slack events endpoint (demo mode)' });
  });
}

// Initialize and start
async function start() {
  try {
    // Initialize database
    await database.init();
    console.log('✅ Database initialized');

    // Start Express server
    const port = process.env.PORT || 3000;
    expressApp.listen(port, () => {
      console.log(`🚀 Server started on port ${port}`);
      console.log(`📝 Configure GitLab webhook URL: ${process.env.APP_URL}/webhook/gitlab`);
      console.log(`🔗 OAuth callback URL: ${process.env.APP_URL}/auth/gitlab/callback`);
    });

    console.log('⚡️ Slack-GitLab Notifier ready to work!');
  } catch (error) {
    console.error('❌ Error while starting the application:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

start();
