#!/bin/bash

# Скрипт установки Slack-GitLab Notifier Bot

set -e

echo "🚀 Установка Slack-GitLab Notifier Bot..."

# Проверка прав суперпользователя
if [[ $EUID -ne 0 ]]; then
   echo "❌ Этот скрипт должен быть запущен с правами root (sudo)" 
   exit 1
fi

# Установка Node.js если не установлен
if ! command -v node &> /dev/null; then
    echo "📦 Устанавливаем Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt-get install -y nodejs
fi

# Создание пользователя для сервиса
if ! id "nodejs" &>/dev/null; then
    echo "👤 Создаем пользователя nodejs..."
    useradd --system --no-create-home --shell /bin/false nodejs
fi

# Создание директорий
echo "📁 Создаем директории..."
mkdir -p /opt/slack-gitlab-bot
mkdir -p /opt/slack-gitlab-bot/data
mkdir -p /opt/slack-gitlab-bot/logs
mkdir -p /var/log/slack-gitlab-bot

# Копирование файлов
echo "📋 Копируем файлы приложения..."
cp -r ./* /opt/slack-gitlab-bot/
cd /opt/slack-gitlab-bot

# Установка зависимостей
echo "📦 Устанавливаем зависимости..."
npm ci --only=production

# Настройка прав доступа
echo "🔐 Настраиваем права доступа..."
chown -R nodejs:nodejs /opt/slack-gitlab-bot
chown -R nodejs:nodejs /var/log/slack-gitlab-bot
chmod +x /opt/slack-gitlab-bot/scripts/*.sh

# Создание .env файла если не существует
if [ ! -f "/opt/slack-gitlab-bot/.env" ]; then
    echo "⚙️  Создаем файл конфигурации..."
    cp /opt/slack-gitlab-bot/.env.example /opt/slack-gitlab-bot/.env
    chown nodejs:nodejs /opt/slack-gitlab-bot/.env
    chmod 600 /opt/slack-gitlab-bot/.env
    
    echo "❗ ВАЖНО: Отредактируйте файл /opt/slack-gitlab-bot/.env с вашими настройками!"
fi

# Установка systemd сервиса
echo "🔧 Устанавливаем systemd сервис..."
cp /opt/slack-gitlab-bot/slack-gitlab-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable slack-gitlab-bot

# Инициализация базы данных
echo "🗄️  Инициализируем базу данных..."
sudo -u nodejs node /opt/slack-gitlab-bot/src/setup-database.js

echo "✅ Установка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Отредактируйте /opt/slack-gitlab-bot/.env с вашими настройками"
echo "2. Запустите сервис: sudo systemctl start slack-gitlab-bot"
echo "3. Проверьте статус: sudo systemctl status slack-gitlab-bot"
echo "4. Просмотрите логи: sudo journalctl -u slack-gitlab-bot -f"
echo ""
echo "🌐 Приложение будет доступно на порту 3000"
echo "📚 Документация: https://github.com/your-repo/slack-gitlab-notifier"
