# 🚀 Быстрый старт

## Локальный запуск приложения

### 1. Установка зависимостей
```bash
npm install
```

### 2. Инициализация базы данных
```bash
npm run setup-db
```

### 3. Создание .env файла
Создайте файл `.env` с минимальными настройками:
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

### 4. Запуск приложения
```bash
# В режиме разработки (с автоперезагрузкой)
npm run dev

# Или в обычном режиме
npm start
```

## 🧪 Тестирование эндпоинтов

После запуска приложение будет доступно на `http://localhost:3000`

### Основные эндпоинты:

- **GET /** - статус приложения
- **POST /webhook/gitlab** - webhook для GitLab
- **POST /slack/events** - события от Slack
- **GET /auth/gitlab/callback** - OAuth callback для GitLab

### Примеры тестов:

```bash
# Проверка статуса
curl http://localhost:3000

# Тест GitLab webhook (без токена - получите ошибку авторизации)
curl http://localhost:3000/webhook/gitlab -X POST -H "Content-Type: application/json" -d '{"test": "data"}'

# Тест GitLab webhook с токеном
curl http://localhost:3000/webhook/gitlab -X POST -H "Content-Type: application/json" -H "x-gitlab-token: test-webhook-secret" -d '{"test": "data"}'

# Тест Slack events (демо-режим)
curl http://localhost:3000/slack/events -X POST -H "Content-Type: application/json" -d '{"test": "slack"}'
```

## 📋 Логи

Приложение выводит подробные логи в консоль:
- ✅ Успешные операции (зеленые галочки)
- ⚠️  Предупреждения (желтые треугольники)  
- ❌ Ошибки (красные крестики)
- 📨 Webhook события
- 🗄️  Операции с базой данных

## 🔧 Настройка для продакшена

Для использования в продакшене замените тестовые значения в `.env` на реальные:

1. **Slack App** - создайте приложение на https://api.slack.com/apps
2. **GitLab OAuth** - создайте приложение в Settings → Applications
3. **Домен** - замените `localhost` на ваш реальный домен
4. **Webhook Secret** - используйте сильный случайный токен

## 🛑 Остановка приложения

```bash
# Остановка процесса на порту 3000
lsof -ti:3000 | xargs kill -9

# Или просто Ctrl+C в терминале где запущено приложение
```
