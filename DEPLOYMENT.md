# 🚀 Руководство по развертыванию

## Варианты размещения

### 🎯 **Рекомендуемые варианты:**

1. **VPS/VDS сервер** (DigitalOcean, Linode, Hetzner) - от $5/месяц
2. **Облачные платформы** (Railway, Render, Heroku)
3. **Собственный сервер** (если есть статический IP)

## 📋 Пошаговое развертывание

### **Вариант 1: VPS с Docker (Рекомендуется)**

#### Шаг 1: Подготовка сервера
```bash
# Подключение к серверу
ssh root@your-server-ip

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Создание директории для приложения
mkdir -p /opt/slack-gitlab-bot
cd /opt/slack-gitlab-bot
```

#### Шаг 2: Клонирование репозитория
```bash
git clone https://github.com/YOUR_USERNAME/slack-gitlab-notifier.git .
```

#### Шаг 3: Настройка окружения
```bash
# Создание .env файла
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

# Установка прав доступа
chmod 600 .env
```

#### Шаг 4: Запуск приложения
```bash
docker-compose up -d
```

#### Шаг 5: Настройка nginx (опционально)
```bash
# Установка nginx
apt update && apt install nginx

# Копирование конфигурации
cp config/nginx.conf /etc/nginx/sites-available/slack-gitlab-bot
ln -s /etc/nginx/sites-available/slack-gitlab-bot /etc/nginx/sites-enabled/

# Редактирование конфигурации
nano /etc/nginx/sites-available/slack-gitlab-bot
# Замените your-domain.com на ваш домен

# Получение SSL сертификата
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com

# Перезапуск nginx
systemctl restart nginx
```

### **Вариант 2: Railway (Простой)**

1. **Зарегистрируйтесь на** [Railway.app](https://railway.app)
2. **Подключите GitHub репозиторий**
3. **Установите переменные окружения:**
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   SLACK_SIGNING_SECRET=your-secret
   GITLAB_APPLICATION_ID=your-id
   GITLAB_APPLICATION_SECRET=your-secret
   PORT=3000
   NODE_ENV=production
   ```
4. **Railway автоматически развернет приложение**

### **Вариант 3: Render (Бесплатный тариф)**

1. **Зарегистрируйтесь на** [Render.com](https://render.com)
2. **Создайте новый Web Service**
3. **Подключите GitHub репозиторий**
4. **Настройки:**
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Установите переменные окружения**

## 🔧 Настройка автоматического развертывания

### GitHub Secrets

В настройках вашего GitHub репозитория добавьте секреты:

**Для SSH развертывания:**
- `HOST` - IP адрес сервера
- `USERNAME` - имя пользователя (обычно root)
- `SSH_KEY` - приватный SSH ключ
- `PORT` - SSH порт (обычно 22)

**Токены приложения:**
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `GITLAB_APPLICATION_ID`
- `GITLAB_APPLICATION_SECRET`
- `GITLAB_INSTANCE_URL`
- `APP_URL`
- `WEBHOOK_SECRET`

### Автоматическое развертывание

После настройки GitHub Actions каждый push в main ветку будет:
1. ✅ Запускать тесты
2. 🏗️ Собирать Docker образ
3. 🚀 Развертывать на сервере
4. ✅ Проверять статус

## 🔗 Настройка URL в приложениях

### Slack App настройки
Замените localhost на ваш домен:
- **Request URL**: `https://your-domain.com/slack/events`
- **OAuth Redirect URL**: `https://your-domain.com/auth/gitlab/callback`

### GitLab OAuth приложение
- **Redirect URI**: `https://your-domain.com/auth/gitlab/callback`

### GitLab Webhooks
В каждом проекте добавьте webhook:
- **URL**: `https://your-domain.com/webhook/gitlab`
- **Secret Token**: значение WEBHOOK_SECRET
- **Events**: Merge request events, Comments

## 📊 Мониторинг

### Проверка статуса
```bash
# Docker
docker-compose ps
docker-compose logs -f

# Systemd
sudo systemctl status slack-gitlab-bot
sudo journalctl -u slack-gitlab-bot -f

# Тест API
curl https://your-domain.com
```

### Логи приложения
```bash
# Docker
docker-compose logs slack-gitlab-bot

# Файлы логов
tail -f /opt/slack-gitlab-bot/logs/app.log
```

## 🔒 Безопасность

1. **Firewall настройки:**
```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

2. **Регулярные обновления:**
```bash
# Автоматические обновления системы
apt install unattended-upgrades
```

3. **Backup базы данных:**
```bash
# Настройка cron для ежедневного backup
0 2 * * * cd /opt/slack-gitlab-bot && ./scripts/backup.sh
```

## 🆘 Troubleshooting

### Частые проблемы:

**Приложение не запускается:**
```bash
docker-compose logs
# Проверьте .env файл и переменные окружения
```

**Webhook не работает:**
- Проверьте URL доступность извне
- Проверьте WEBHOOK_SECRET
- Проверьте логи: `docker-compose logs | grep webhook`

**OAuth не работает:**
- Проверьте Redirect URI в GitLab и Slack
- Проверьте APP_URL в .env

**База данных недоступна:**
```bash
docker-compose exec slack-gitlab-bot ls -la data/
# Проверьте права доступа к директории data/
```

---

**Готово! Ваш бот будет работать 24/7 и автоматически обновляться при изменениях кода.** 🎉
