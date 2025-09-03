const axios = require('axios');
const crypto = require('crypto');

class AuthService {
  constructor(database) {
    this.database = database;
    this.gitlabUrl = process.env.GITLAB_INSTANCE_URL || 'https://gitlab.com';
    this.clientId = process.env.GITLAB_APPLICATION_ID;
    this.clientSecret = process.env.GITLAB_APPLICATION_SECRET;
    this.redirectUri = `${process.env.APP_URL}/auth/gitlab/callback`;
    
    // Временное хранение состояний OAuth (в продакшене использовать Redis)
    this.oauthStates = new Map();
  }

  generateAuthUrl(slackUserId, slackTeamId) {
    const state = crypto.randomBytes(32).toString('hex');
    
    // Сохраняем состояние для последующей проверки
    this.oauthStates.set(state, {
      slackUserId,
      slackTeamId,
      timestamp: Date.now()
    });

    // Очистка старых состояний (старше 10 минут)
    this.cleanupExpiredStates();

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: state,
      scope: 'read_user read_api'
    });

    return `${this.gitlabUrl}/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error('OAuth ошибка:', error);
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Ошибка авторизации</h2>
              <p>Произошла ошибка при подключении к GitLab: ${error}</p>
              <p><a href="#" onclick="window.close()">Закрыть окно</a></p>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Неверные параметры</h2>
              <p>Отсутствуют необходимые параметры авторизации</p>
              <p><a href="#" onclick="window.close()">Закрыть окно</a></p>
            </body>
          </html>
        `);
      }

      // Проверяем состояние
      const stateData = this.oauthStates.get(state);
      if (!stateData) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Недействительное состояние</h2>
              <p>Сессия авторизации истекла или недействительна</p>
              <p><a href="#" onclick="window.close()">Закрыть окно</a></p>
            </body>
          </html>
        `);
      }

      // Удаляем состояние после использования
      this.oauthStates.delete(state);

      // Обмениваем код на токен
      const tokenData = await this.exchangeCodeForToken(code);
      
      // Получаем информацию о пользователе GitLab
      const userData = await this.getGitLabUserInfo(tokenData.access_token);

      // Сохраняем данные пользователя в базе
      await this.database.saveUser(stateData.slackUserId, stateData.slackTeamId, {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      console.log(`✅ Пользователь ${userData.username} (${userData.email}) подключен к Slack пользователю ${stateData.slackUserId}`);

      // Возвращаем страницу успеха
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <div style="max-width: 500px; margin: 0 auto;">
              <h2 style="color: #27ae60;">✅ Успешно подключено!</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>GitLab аккаунт:</strong> ${userData.username}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
              </div>
              <p style="color: #666;">Теперь вы будете получать уведомления о Merge Request-ах и mentions из GitLab в Slack!</p>
              <button onclick="window.close()" style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                Закрыть окно
              </button>
            </div>
          </body>
        </html>
      `);

    } catch (error) {
      console.error('Ошибка в OAuth callback:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">❌ Ошибка сервера</h2>
            <p>Произошла ошибка при обработке авторизации</p>
            <p><a href="#" onclick="window.close()">Закрыть окно</a></p>
          </body>
        </html>
      `);
    }
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(`${this.gitlabUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      });

      return response.data;
    } catch (error) {
      console.error('Ошибка при обмене кода на токен:', error.response?.data || error.message);
      throw new Error('Не удалось получить токен доступа');
    }
  }

  async getGitLabUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.gitlabUrl}/api/v4/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Ошибка при получении информации о пользователе:', error.response?.data || error.message);
      throw new Error('Не удалось получить информацию о пользователе GitLab');
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.gitlabUrl}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      console.error('Ошибка при обновлении токена:', error.response?.data || error.message);
      throw new Error('Не удалось обновить токен доступа');
    }
  }

  cleanupExpiredStates() {
    const now = Date.now();
    const expiredStates = [];

    for (const [state, data] of this.oauthStates.entries()) {
      // Удаляем состояния старше 10 минут
      if (now - data.timestamp > 10 * 60 * 1000) {
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => {
      this.oauthStates.delete(state);
    });
  }

  // Проверка валидности токена
  async validateToken(accessToken) {
    try {
      const response = await axios.get(`${this.gitlabUrl}/api/v4/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AuthService;
