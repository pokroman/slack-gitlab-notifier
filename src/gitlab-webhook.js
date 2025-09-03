const crypto = require("crypto");

class GitLabWebhook {
	constructor(database, notificationService) {
		this.database = database;
		this.notificationService = notificationService;
		this.webhookSecret = process.env.WEBHOOK_SECRET;
	}

	async handleWebhook(req, res) {
		try {
			// Check webhook token if it is set
			if (this.webhookSecret) {
				const signature = req.headers["x-gitlab-token"];
				if (signature !== this.webhookSecret) {
					console.warn("Invalid webhook token");
					return res.status(401).json({ error: "Unauthorized" });
				}
			}

			const event = req.headers["x-gitlab-event"];
			const payload = req.body;

			console.log(`📨 Received GitLab webhook: ${event}`);

			// Log webhook
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
				console.error("Error processing webhook:", error);
				await this.database.updateWebhookStatus(logId, false, error.message);
				res.status(500).json({ error: "Processing failed" });
			}
		} catch (error) {
			console.error("Error webhook handler:", error);
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
				// You can add processing of push events if needed
				console.log("Push Hook received, but not processed");
				break;

			default:
				console.log(`Unknown event type: ${event}`);
		}
	}

	async handleMergeRequestEvent(payload) {
		const { object_attributes, project, assignees, reviewers } = payload;

		if (!object_attributes) return;

		const action = object_attributes.action;
		const mergeRequest = object_attributes;

		console.log(
			`🔄 Merge Request ${action}: ${mergeRequest.title} (${mergeRequest.iid})`,
		);

		// Determine who needs to be notified
		const usersToNotify = [];

		// Notify assignees
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

		// Notify reviewers (if there are any)
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

		// Send notifications
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

				// Log notification
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
					`An error occurred while sending MR notification to user ${user.slack_user_id}:`,
					error,
				);
			}
		}
	}

	async handleNoteEvent(payload) {
		const { object_attributes, project, merge_request } = payload;

		if (!object_attributes || !merge_request) return;

		const note = object_attributes;
		const noteText = note.note;

		console.log(
			`💬 New comment in MR ${merge_request.iid}: ${noteText.substring(0, 100)}...`,
		);

		// Find mentions in the comment (@username)
		const mentionRegex = /@(\w+)/g;
		const mentions = [];
		let match = mentionRegex.exec(noteText);

		while (match !== null) {
			mentions.push(match[1]);
			match = mentionRegex.exec(noteText);
		}

		if (mentions.length === 0) return;

		// Get users by mentions
		const users = await this.database.getAllUsers();
		const mentionedUsers = users.filter((user) =>
			mentions.includes(user.gitlab_username),
		);

		// Send notifications about mentions
		for (const user of mentionedUsers) {
			try {
				await this.notificationService.sendMentionNotification(
					user,
					merge_request,
					project,
					note,
					payload.user,
				);

				// Log notification
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
					`An error occurred while sending mention notification to user ${user.slack_user_id}:`,
					error,
				);
			}
		}
	}

	// Method to verify webhook signature (if secret is used)
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

	// Helper method to extract emails from GitLab data
	extractEmailsFromUsers(users) {
		if (!users || !Array.isArray(users)) return [];
		return users.map((user) => user.email).filter((email) => email);
	}

	// Method to get user information from GitLab API
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

			return response.data[0]; // Return the first found user
		} catch (error) {
			console.error(`Error searching for user ${username}:`, error);
			return null;
		}
	}
}

module.exports = GitLabWebhook;
