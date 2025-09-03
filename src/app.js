require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const Database = require('./database');
const GitLabWebhook = require('./gitlab-webhook');
const AuthService = require('./auth-service');
const NotificationService = require('./notification-service');

// Инициализация Slack приложения
let slackApp;
try {
  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: false, // используем HTTP mode для webhooks
  });
} catch (error) {
  console.warn('⚠️  Slack App не инициализирован (возможно неверные токены):', error.message);
  // Создаем заглушку для демонстрации
  slackApp = {
    command: () => {},
    client: {
      chat: {
        postMessage: async () => console.log('📨 [DEMO] Сообщение отправлено в Slack')
      }
    }
  };
}

// Инициализация Express сервера
const expressApp = express();
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Инициализация сервисов
const database = new Database();
const authService = new AuthService(database);
const notificationService = new NotificationService(slackApp, database);
const gitlabWebhook = new GitLabWebhook(database, notificationService);

// Slack команды и события
slackApp.command('/gitlab-connect', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    const authUrl = authService.generateAuthUrl(command.user_id, command.team_id);
    
    await respond({
      response_type: 'ephemeral',
      text: 'Подключите ваш GitLab аккаунт',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🔗 *Подключение к GitLab*\n\nДля получения уведомлений о Merge Request-ах и mentions из GitLab, подключите ваш аккаунт:'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Подключить GitLab'
              },
              url: authUrl,
              style: 'primary'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Ошибка при создании ссылки авторизации:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Произошла ошибка при создании ссылки для подключения. Попробуйте позже.'
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
        text: `✅ Ваш GitLab аккаунт подключен!\n📧 GitLab email: ${user.gitlab_email}\n🆔 GitLab ID: ${user.gitlab_user_id}`
      });
    } else {
      await respond({
        response_type: 'ephemeral',
        text: '❌ GitLab аккаунт не подключен. Используйте `/gitlab-connect` для подключения.'
      });
    }
  } catch (error) {
    console.error('Ошибка при проверке статуса:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Произошла ошибка при проверке статуса подключения.'
    });
  }
});

slackApp.command('/gitlab-disconnect', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    await database.removeUser(command.user_id, command.team_id);
    await respond({
      response_type: 'ephemeral',
      text: '✅ GitLab аккаунт успешно отключен от Slack.'
    });
  } catch (error) {
    console.error('Ошибка при отключении:', error);
    await respond({
      response_type: 'ephemeral',
      text: '❌ Произошла ошибка при отключении аккаунта.'
    });
  }
});

// Express маршруты
expressApp.get('/', (req, res) => {
  res.json({ 
    message: 'Slack-GitLab Notifier Bot',
    status: 'running',
    version: '1.0.0'
  });
});

// Маршрут для OAuth callback от GitLab
expressApp.get('/auth/gitlab/callback', authService.handleCallback.bind(authService));

// Маршрут для получения webhooks от GitLab
expressApp.post('/webhook/gitlab', gitlabWebhook.handleWebhook.bind(gitlabWebhook));

// Slack события (обработчик для Slack App)
if (slackApp.receiver && slackApp.receiver.router) {
  expressApp.use('/slack/events', slackApp.receiver.router);
} else {
  // Заглушка для локального тестирования без настроенных Slack токенов
  expressApp.post('/slack/events', (req, res) => {
    res.status(200).json({ message: 'Slack events endpoint (demo mode)' });
  });
}

// Инициализация и запуск
async function start() {
  try {
    // Инициализация базы данных
    await database.init();
    console.log('✅ База данных инициализирована');

    // Запуск Express сервера
    const port = process.env.PORT || 3000;
    expressApp.listen(port, () => {
      console.log(`🚀 Сервер запущен на порту ${port}`);
      console.log(`📝 Настройте GitLab webhook URL: ${process.env.APP_URL}/webhook/gitlab`);
      console.log(`🔗 OAuth callback URL: ${process.env.APP_URL}/auth/gitlab/callback`);
    });

    console.log('⚡️ Slack-GitLab Notifier готов к работе!');
  } catch (error) {
    console.error('❌ Ошибка при запуске приложения:', error);
    process.exit(1);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

start();
