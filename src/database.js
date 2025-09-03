const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || './data/app.db';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Создаем директорию для базы данных если её нет
      const dbDir = path.dirname(this.dbPath);
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка при открытии базы данных:', err);
          reject(err);
        } else {
          console.log('Подключено к SQLite базе данных');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          slack_user_id TEXT NOT NULL,
          slack_team_id TEXT NOT NULL,
          gitlab_user_id INTEGER,
          gitlab_username TEXT,
          gitlab_email TEXT,
          gitlab_token TEXT,
          gitlab_refresh_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(slack_user_id, slack_team_id)
        )
      `;

      const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          gitlab_event_type TEXT NOT NULL,
          gitlab_project_id INTEGER,
          gitlab_merge_request_id INTEGER,
          gitlab_object_id INTEGER,
          event_data TEXT,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `;

      const createWebhookLogsTable = `
        CREATE TABLE IF NOT EXISTS webhook_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT,
          project_id INTEGER,
          object_id INTEGER,
          processed BOOLEAN DEFAULT FALSE,
          received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          error_message TEXT
        )
      `;

      this.db.serialize(() => {
        this.db.run(createUsersTable);
        this.db.run(createNotificationsTable);
        this.db.run(createWebhookLogsTable, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Таблицы базы данных созданы успешно');
            resolve();
          }
        });
      });
    });
  }

  // Методы для работы с пользователями
  async saveUser(slackUserId, slackTeamId, gitlabData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users 
        (slack_user_id, slack_team_id, gitlab_user_id, gitlab_username, gitlab_email, gitlab_token, gitlab_refresh_token, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run([
        slackUserId,
        slackTeamId,
        gitlabData.id,
        gitlabData.username,
        gitlabData.email,
        gitlabData.access_token,
        gitlabData.refresh_token
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  async getUser(slackUserId, slackTeamId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE slack_user_id = ? AND slack_team_id = ?',
        [slackUserId, slackTeamId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getUserByGitlabId(gitlabUserId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE gitlab_user_id = ?',
        [gitlabUserId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  async getUsersByGitlabEmails(emails) {
    return new Promise((resolve, reject) => {
      if (!emails || emails.length === 0) {
        resolve([]);
        return;
      }

      const placeholders = emails.map(() => '?').join(',');
      const query = `SELECT * FROM users WHERE gitlab_email IN (${placeholders})`;

      this.db.all(query, emails, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM users', (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async removeUser(slackUserId, slackTeamId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM users WHERE slack_user_id = ? AND slack_team_id = ?',
        [slackUserId, slackTeamId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Методы для логирования уведомлений
  async logNotification(userId, eventType, projectId, mergeRequestId, objectId, eventData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO notifications 
        (user_id, gitlab_event_type, gitlab_project_id, gitlab_merge_request_id, gitlab_object_id, event_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        userId,
        eventType,
        projectId,
        mergeRequestId,
        objectId,
        JSON.stringify(eventData)
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  // Методы для логирования webhook-ов
  async logWebhook(eventType, projectId, objectId, processed = false, errorMessage = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO webhook_logs 
        (event_type, project_id, object_id, processed, error_message)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run([eventType, projectId, objectId, processed, errorMessage], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  async updateWebhookStatus(logId, processed, errorMessage = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE webhook_logs SET processed = ?, error_message = ? WHERE id = ?',
        [processed, errorMessage, logId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Метод для закрытия соединения с базой данных
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Ошибка при закрытии базы данных:', err);
        } else {
          console.log('Соединение с базой данных закрыто');
        }
      });
    }
  }
}

module.exports = Database;
