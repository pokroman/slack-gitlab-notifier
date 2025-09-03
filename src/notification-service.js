class NotificationService {
  constructor(slackApp, database) {
    this.slackApp = slackApp;
    this.database = database;
  }

  async sendMergeRequestNotification(user, mergeRequest, project, action, reason, author) {
    try {
      const actionText = this.getActionText(action);
      const reasonText = reason === 'assignee' ? 'assigned as executor' : 'assigned as reviewer';
      
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
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Author:*\n${author.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Your role:*\n${reasonText}`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n${mergeRequest.state}`
            }
          ]
        }
      ];

      // Add description if there is one
      if (mergeRequest.description && mergeRequest.description.trim()) {
        const description = mergeRequest.description.length > 300 
          ? mergeRequest.description.substring(0, 300) + '...'
          : mergeRequest.description;
        
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${description}`
          }
        });
      }

      // Add action buttons
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '👀 View MR'
            },
            url: mergeRequest.url,
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📁 Open project'
            },
            url: project.web_url
          }
        ]
      });

      // Add additional information
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

      console.log(`✅ MR notification sent to user ${user.slack_user_id}`);

    } catch (error) {
      console.error('Error sending MR notification:', error);
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
            text: `💬 *You were mentioned in a comment*\n\n*MR: ${mergeRequest.title}*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Project:*\n${project.name}`
            },
            {
              type: 'mrkdwn',
              text: `*Comment author:*\n${author.name}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Comment:*\n${this.formatMentionText(noteText)}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💬 Reply'
              },
              url: note.url || mergeRequest.url,
              style: 'primary'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '👀 View MR'
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
        text: `Mention in MR: ${mergeRequest.title}`,
        blocks: blocks
      });

      console.log(`✅ Mention notification sent to user ${user.slack_user_id}`);

    } catch (error) {
      console.error('Error sending mention notification:', error);
      throw error;
    }
  }

  // Helper methods for formatting

  getActionText(action) {
    const actionMap = {
      'open': '📖 Open',
      'close': '🔒 Close',
      'reopen': '🔓 Reopen',
      'update': '📝 Updated',
      'approved': '✅ Approved',
      'unapproved': '❌ Rejected',
      'approval': '👍 Approved',
      'unapproval': '👎 Unapproved',
      'merge': '🔗 Merged',
      'ready': '✨ Ready for review'
    };

    return actionMap[action] || `🔄 ${action}`;
  }

  formatBranches(sourceBranch, targetBranch) {
    return `\`${sourceBranch}\` → \`${targetBranch}\``;
  }

  formatMentionText(text) {
    // Replace @mentions with highlighted text in Slack
    return text.replace(/@(\w+)/g, '*@$1*');
  }

  // Method for sending a test notification
  async sendTestNotification(slackUserId) {
    try {
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${slackUserId}`,
        text: '🧪 Test notification',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🧪 *Test notification*\n\nThis is a test message to check the work of GitLab-Slack integration.'
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: '*Status:*\nConnection established ✅'
              },
              {
                type: 'mrkdwn',
                text: '*Time:*\n' + new Date().toLocaleString('ru-RU')
              }
            ]
          }
        ]
      });

      console.log(`✅ Test notification sent to user ${slackUserId}`);
      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }

  // Method for sending an error notification
  async sendErrorNotification(slackUserId, error, context = '') {
    try {
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: `@${slackUserId}`,
        text: '❌ Error in GitLab integration',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Error in GitLab integration*\n\n${context}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error:*\n\`${error.message || error}\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Try reconnecting the GitLab account by command `/gitlab-connect`'
              }
            ]
          }
        ]
      });
    } catch (sendError) {
      console.error('Error sending error notification:', sendError);
    }
  }

  // Method for sending bulk notifications
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
        console.error(`Error sending notification to user ${notification.user.slack_user_id}:`, error);
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
