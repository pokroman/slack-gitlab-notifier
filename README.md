# Slack-GitLab Notifier Bot

Slack бот для получения уведомлений из GitLab о Merge Request-ах и mentions в комментариях.

## 🚀 Возможности

- 📬 Уведомления о новых Merge Request-ах, где вы назначены как исполнитель или reviewer
- 💬 Уведомления об упоминаниях (@username) в комментариях к MR
- 🔐 Безопасная OAuth авторизация с GitLab
- 📊 Хранение связок между Slack и GitLab аккаунтами
- 🛡️ Проверка webhook токенов для безопасности

## 📋 Требования

- Node.js 16+
- GitLab аккаунт (gitlab.com или self-hosted)
- Slack workspace с правами на создание приложений

## ⚙️ Установка

1. **Клонируйте репозиторий:**
```bash
git clone <your-repo-url>
cd slack-gitlab-notifier
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте файл окружения:**
```bash
cp .env.example .env
```

4. **Настройте переменные окружения в .env файле**

## 🔧 Настройка

### 1. Создание Slack приложения

1. Перейдите на https://api.slack.com/apps
2. Нажмите "Create New App" → "From scratch"
3. Укажите название приложения и выберите workspace
4. В разделе "OAuth & Permissions":
   - Добавьте Redirect URL: `https://yourdomain.com/auth/gitlab/callback`
   - Добавьте Bot Token Scopes:
     - `chat:write`
     - `commands`
     - `users:read`
5. В разделе "Slash Commands" создайте команды:
   - `/gitlab-connect` - подключение GitLab аккаунта
   - `/gitlab-status` - проверка статуса подключения
   - `/gitlab-disconnect` - отключение аккаунта
6. Скопируйте Bot User OAuth Token и Signing Secret в .env

### 2. Создание GitLab OAuth приложения

1. Перейдите в Settings → Applications в вашем GitLab
2. Создайте новое приложение:
   - Name: "Slack Notifier"
   - Redirect URI: `https://yourdomain.com/auth/gitlab/callback`
   - Scopes: `read_user`, `read_api`
3. Скопируйте Application ID и Secret в .env

### 3. Настройка переменных окружения

Заполните .env файл:

```env
# Slack App настройки
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# GitLab OAuth настройки  
GITLAB_APPLICATION_ID=your-gitlab-app-id
GITLAB_APPLICATION_SECRET=your-gitlab-app-secret
GITLAB_INSTANCE_URL=https://gitlab.com

# Приложение настройки
PORT=3000
NODE_ENV=production
APP_URL=https://yourdomain.com

# База данных
DATABASE_PATH=./data/app.db

# Webhook secret для безопасности
WEBHOOK_SECRET=your-webhook-secret
```

## 🏃‍♂️ Запуск

1. **Инициализация базы данных:**
```bash
npm run setup-db
```

2. **Запуск в режиме разработки:**
```bash
npm run dev
```

3. **Запуск в продакшене:**
```bash
npm start
```

## 🔗 Настройка GitLab Webhooks

1. Перейдите в Settings → Webhooks вашего GitLab проекта
2. Добавьте webhook:
   - URL: `https://yourdomain.com/webhook/gitlab`
   - Secret Token: значение из WEBHOOK_SECRET
   - Triggers: выберите "Merge request events" и "Comments"
3. Нажмите "Add webhook"

## 🎮 Использование

### Команды Slack

- `/gitlab-connect` - подключить GitLab аккаунт
- `/gitlab-status` - проверить статус подключения
- `/gitlab-disconnect` - отключить GitLab аккаунт

### Автоматические уведомления

Бот будет отправлять уведомления в следующих случаях:

1. **Merge Request события:**
   - Вы назначены исполнителем (assignee)
   - Вы назначены reviewer-ом
   - MR открыт, закрыт, обновлен или слит

2. **Mentions в комментариях:**
   - Кто-то упомянул вас (@username) в комментарии к MR

## 🗄️ Структура базы данных

### Таблица users
- `slack_user_id` - ID пользователя в Slack
- `slack_team_id` - ID команды в Slack  
- `gitlab_user_id` - ID пользователя в GitLab
- `gitlab_username` - Username в GitLab
- `gitlab_email` - Email в GitLab
- `gitlab_token` - OAuth токен для GitLab API

### Таблица notifications
- Логи отправленных уведомлений

### Таблица webhook_logs
- Логи обработанных webhook-ов

## 🐛 Отладка

1. **Проверьте логи:**
```bash
# В режиме разработки логи выводятся в консоль
npm run dev

# В продакшене можно перенаправить в файл
npm start > logs/app.log 2>&1
```

2. **Проверьте webhook-и:**
   - Убедитесь, что URL доступен из интернета
   - Проверьте правильность Secret Token
   - Посмотрите логи в GitLab Settings → Webhooks

3. **Проверьте OAuth:**
   - Убедитесь в правильности Redirect URI
   - Проверьте Application ID и Secret

## 🔧 Развертывание

### Docker (рекомендуется)

Создайте Dockerfile:

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

Создайте `/etc/systemd/system/slack-gitlab-bot.service`:

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

## 🤝 Вклад в проект

1. Fork репозиторий
2. Создайте feature branch
3. Сделайте commit изменений
4. Создайте Pull Request

## 📄 Лицензия

MIT License - смотрите [LICENSE](LICENSE) файл.

## ❓ Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [Issues](https://github.com/your-repo/issues)
2. Создайте новый Issue с подробным описанием проблемы
3. Приложите логи и конфигурацию (без секретных ключей!)

---

**Приятного использования! 🚀**
