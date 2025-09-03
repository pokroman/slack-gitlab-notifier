class NotificationService {
  constructor(slackApp, database) {
    this.slackApp = slackApp;
    this.database = database;
  }

  async sendMergeRequestNotification(user, mergeRequest, project, action, reason, author) {
    try {
      const actionText = this.getActionText(action);
      const reasonText = reason === 'assignee' ? 'назначен исполнителем' : 'назначен reviewer-ом';
      
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔀 *${actionText} Merge Request*\n\n*${mergeRequest.title}*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Проект:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Автор:*\n${author.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Ваша роль:*\n${reasonText}`
            },
            {
              type: 'mrkdwn',
              text: `*Статус:*\n${mergeRequest.state}`
            }
          ]
        }
      ];

      // Добавляем описание если есть
      if (mergeRequest.description && mergeRequest.description.trim()) {
        const description = mergeRequest.description.length > 300 
          ? mergeRequest.description.substring(0, 300) + '...'
          : mergeRequest.description;
        
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Описание:*\n${description}`
          }
        });
      }

      // Добавляем кнопки действий
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 Посмотреть MR'
            },
            url: mergeRequest.url,
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📁 Открыть проект'
            },
            url: project.web_url
          }
        ]
      });

      // Добавляем дополнительную информацию
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🏷️ MR !${mergeRequest.iid} • ${this.formatBranches(mergeRequest.source_branch, mergeRequest.target_branch)}`
          }
        ]
      });

      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${user.slack_user_id}`,
        text: `${actionText} Merge Request: ${mergeRequest.title}`,
        blocks: blocks
      });

      console.log(`✅ MR уведомление отправлено пользователю ${user.slack_user_id}`);

    } catch (error) {
      console.error('Ошибка при отправке MR уведомления:', error);
      throw error;
    }
  }

  async sendMentionNotification(user, mergeRequest, project, note, author) {
    try {
      const noteText = note.note.length > 500 
        ? note.note.substring(0, 500) + '...'
        : note.note;

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💬 *Вас упомянули в комментарии*\n\n*MR: ${mergeRequest.title}*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Проект:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Автор комментария:*\n${author.name}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Комментарий:*\n${this.formatMentionText(noteText)}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💬 Ответить'
              },
              url: note.url || mergeRequest.url,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👀 Посмотреть MR'
              },
              url: mergeRequest.url
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🏷️ MR !${mergeRequest.iid} • ${project.name}`
            }
          ]
        }
      ];

      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${user.slack_user_id}`,
        text: `Упоминание в MR: ${mergeRequest.title}`,
        blocks: blocks
      });

      console.log(`✅ Mention уведомление отправлено пользователю ${user.slack_user_id}`);

    } catch (error) {
      console.error('Ошибка при отправке mention уведомления:', error);
      throw error;
    }
  }

  // Вспомогательные методы для форматирования

  getActionText(action) {
    const actionMap = {
      'open': '📖 Открыт',
      'close': '🔒 Закрыт',
      'reopen': '🔓 Переоткрыт',
      'update': '📝 Обновлен',
      'approved': '✅ Одобрен',
      'unapproved': '❌ Отклонен',
      'approval': '👍 Получил одобрение',
      'unapproval': '👎 Одобрение отозвано',
      'merge': '🔗 Слит',
      'ready': '✨ Готов к ревью'
    };

    return actionMap[action] || `🔄 ${action}`;
  }

  formatBranches(sourceBranch, targetBranch) {
    return `\`${sourceBranch}\` → \`${targetBranch}\``;
  }

  formatMentionText(text) {
    // Заменяем @mentions на выделенный текст в Slack
    return text.replace(/@(\w+)/g, '*@$1*');
  }

  // Метод для отправки тестового уведомления
  async sendTestNotification(slackUserId) {
    try {
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${slackUserId}`,
        text: '🧪 Тестовое уведомление',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🧪 *Тестовое уведомление*\n\nЭто тестовое сообщение для проверки работы GitLab-Slack интеграции.'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: '*Статус:*\nСвязь установлена ✅'
              },
              {
                type: 'mrkdwn',
                text: '*Время:*\n' + new Date().toLocaleString('ru-RU')
              }
            ]
          }
        ]
      });

      console.log(`✅ Тестовое уведомление отправлено пользователю ${slackUserId}`);
      return true;
    } catch (error) {
      console.error('Ошибка при отправке тестового уведомления:', error);
      return false;
    }
  }

  // Метод для отправки уведомления об ошибке
  async sendErrorNotification(slackUserId, error, context = '') {
    try {
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${slackUserId}`,
        text: '❌ Ошибка в GitLab интеграции',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Ошибка в GitLab интеграции*\n\n${context}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Ошибка:*\n\`${error.message || error}\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Попробуйте переподключить GitLab аккаунт командой `/gitlab-connect`'
              }
            ]
          }
        ]
      });
    } catch (sendError) {
      console.error('Ошибка при отправке уведомления об ошибке:', sendError);
    }
  }

  // Метод для массовой отправки уведомлений
  async sendBulkNotifications(notifications) {
    const results = [];

    for (const notification of notifications) {
      try {
        if (notification.type === 'merge_request') {
          await this.sendMergeRequestNotification(
            notification.user,
            notification.mergeRequest,
            notification.project,
            notification.action,
            notification.reason,
            notification.author
          );
        } else if (notification.type === 'mention') {
          await this.sendMentionNotification(
            notification.user,
            notification.mergeRequest,
            notification.project,
            notification.note,
            notification.author
          );
        }

        results.push({ success: true, userId: notification.user.slack_user_id });
      } catch (error) {
        console.error(`Ошибка при отправке уведомления пользователю ${notification.user.slack_user_id}:`, error);
        results.push({ 
          success: false, 
          userId: notification.user.slack_user_id, 
          error: error.message 
        });
      }
    }

    return results;
  }
}

module.exports = NotificationService;
