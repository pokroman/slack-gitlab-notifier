const crypto = require("crypto");

class GitLabWebhook {
	constructor(database, notificationService) {
		this.database = database;
		this.notificationService = notificationService;
		this.webhookSecret = process.env.WEBHOOK_SECRET;
	}

	async handleWebhook(req, res) {
		try {
			// Проверяем токен webhook-а если он настроен
			if (this.webhookSecret) {
				const signature = req.headers["x-gitlab-token"];
				if (signature !== this.webhookSecret) {
					console.warn("Неверный webhook токен");
					return res.status(401).json({ error: "Unauthorized" });
				}
			}

			const event = req.headers["x-gitlab-event"];
			const payload = req.body;

			console.log(`📨 Получен GitLab webhook: ${event}`);

			// Логируем webhook
			const logId = await this.database.logWebhook(
				event,
				payload.project?.id,
				payload.object_attributes?.id || payload.merge_request?.id,
			);

			try {
				await this.processWebhook(event, payload);
				await this.database.updateWebhookStatus(logId, true);
				res.status(200).json({ status: "success" });
			} catch (error) {
				console.error("Ошибка при обработке webhook:", error);
				await this.database.updateWebhookStatus(logId, false, error.message);
				res.status(500).json({ error: "Processing failed" });
			}
		} catch (error) {
			console.error("Ошибка webhook обработчика:", error);
			res.status(500).json({ error: "Internal server error" });
		}
	}

	async processWebhook(event, payload) {
		switch (event) {
			case "Merge Request Hook":
				await this.handleMergeRequestEvent(payload);
				break;

			case "Note Hook":
				await this.handleNoteEvent(payload);
				break;

			case "Push Hook":
				// Можно добавить обработку push событий если нужно
				console.log("Push Hook получен, но не обрабатывается");
				break;

			default:
				console.log(`Неизвестный тип события: ${event}`);
		}
	}

	async handleMergeRequestEvent(payload) {
		const { object_attributes, user, project, assignees, reviewers } = payload;

		if (!object_attributes) return;

		const action = object_attributes.action;
		const mergeRequest = object_attributes;

		console.log(
			`🔄 Merge Request ${action}: ${mergeRequest.title} (${mergeRequest.iid})`,
		);

		// Определяем кого нужно уведомить
		const usersToNotify = [];

		// Уведомляем assignees
		if (assignees && assignees.length > 0) {
			for (const assignee of assignees) {
				const user = await this.database.getUserByGitlabId(assignee.id);
				if (user) {
					usersToNotify.push({
						user,
						reason: "assignee",
					});
				}
			}
		}

		// Уведомляем reviewers (если есть)
		if (reviewers && reviewers.length > 0) {
			for (const reviewer of reviewers) {
				const user = await this.database.getUserByGitlabId(reviewer.id);
				if (user) {
					usersToNotify.push({
						user,
						reason: "reviewer",
					});
				}
			}
		}

		// Отправляем уведомления
		for (const { user, reason } of usersToNotify) {
			try {
				await this.notificationService.sendMergeRequestNotification(
					user,
					mergeRequest,
					project,
					action,
					reason,
					payload.user,
				);

				// Логируем уведомление
				await this.database.logNotification(
					user.id,
					"merge_request",
					project.id,
					mergeRequest.iid,
					mergeRequest.id,
					{ action, reason, user: payload.user },
				);
			} catch (error) {
				console.error(
					`Ошибка при отправке MR уведомления пользователю ${user.slack_user_id}:`,
					error,
				);
			}
		}
	}

	async handleNoteEvent(payload) {
		const { object_attributes, user, project, merge_request } = payload;

		if (!object_attributes || !merge_request) return;

		const note = object_attributes;
		const noteText = note.note;

		console.log(
			`💬 Новый комментарий в MR ${merge_request.iid}: ${noteText.substring(0, 100)}...`,
		);

		// Находим mentions в комментарии (@username)
		const mentionRegex = /@(\w+)/g;
		const mentions = [];
		let match;

		while ((match = mentionRegex.exec(noteText)) !== null) {
			mentions.push(match[1]);
		}

		if (mentions.length === 0) return;

		// Получаем пользователей по упоминаниям
		const users = await this.database.getAllUsers();
		const mentionedUsers = users.filter((user) =>
			mentions.includes(user.gitlab_username),
		);

		// Отправляем уведомления о mentions
		for (const user of mentionedUsers) {
			try {
				await this.notificationService.sendMentionNotification(
					user,
					merge_request,
					project,
					note,
					payload.user,
				);

				// Логируем уведомление
				await this.database.logNotification(
					user.id,
					"mention",
					project.id,
					merge_request.iid,
					note.id,
					{ note_text: noteText, author: payload.user },
				);
			} catch (error) {
				console.error(
					`Ошибка при отправке mention уведомления пользователю ${user.slack_user_id}:`,
					error,
				);
			}
		}
	}

	// Метод для проверки подписи webhook-а (если используется secret)
	verifySignature(payload, signature) {
		if (!this.webhookSecret) return true;

		const expectedSignature = crypto
			.createHmac("sha256", this.webhookSecret)
			.update(JSON.stringify(payload))
			.digest("hex");

		return crypto.timingSafeEqual(
			Buffer.from(signature, "hex"),
			Buffer.from(expectedSignature, "hex"),
		);
	}

	// Вспомогательный метод для извлечения emails из GitLab данных
	extractEmailsFromUsers(users) {
		if (!users || !Array.isArray(users)) return [];
		return users.map((user) => user.email).filter((email) => email);
	}

	// Метод для получения информации о пользователе по GitLab API
	async getGitLabUserByUsername(username, accessToken) {
		try {
			const axios = require("axios");
			const gitlabUrl = process.env.GITLAB_INSTANCE_URL || "https://gitlab.com";

			const response = await axios.get(
				`${gitlabUrl}/api/v4/users?username=${username}`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			);

			return response.data[0]; // Возвращаем первого найденного пользователя
		} catch (error) {
			console.error(`Ошибка при поиске пользователя ${username}:`, error);
			return null;
		}
	}
}

module.exports = GitLabWebhook;
