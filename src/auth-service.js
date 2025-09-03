const axios = require('axios');
const crypto = require('crypto');

class AuthService {
  constructor(database) {
    this.database = database;
    this.gitlabUrl = process.env.GITLAB_INSTANCE_URL || 'https://gitlab.com';
    this.clientId = process.env.GITLAB_APPLICATION_ID;
    this.clientSecret = process.env.GITLAB_APPLICATION_SECRET;
    this.redirectUri = `${process.env.APP_URL}/auth/gitlab/callback`;
    
    // Temporary OAuth state storage (use Redis in production)
    this.oauthStates = new Map();
  }

  generateAuthUrl(slackUserId, slackTeamId) {
    const state = crypto.randomBytes(32).toString('hex');
    
    // Save state for subsequent verification
    this.oauthStates.set(state, {
      slackUserId,
      slackTeamId,
      timestamp: Date.now()
    });

    // Cleanup old states (older than 10 minutes)
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
        console.error('OAuth error:', error);
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Authorization error</h2>
              <p>An error occurred while connecting to GitLab: ${error}</p>
              <p><a href="#" onclick="window.close()">Close window</a></p>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Invalid parameters</h2>
              <p>Missing required authorization parameters</p>
              <p><a href="#" onclick="window.close()">Close window</a></p>
            </body>
          </html>
        `);
      }

      // Check state
      const stateData = this.oauthStates.get(state);
      if (!stateData) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #e74c3c;">❌ Invalid state</h2>
              <p>Authorization session expired or invalid</p>
              <p><a href="#" onclick="window.close()">Close window</a></p>
            </body>
          </html>
        `);
      }

      // Delete state after use
      this.oauthStates.delete(state);

      // Exchange code for token
      const tokenData = await this.exchangeCodeForToken(code);
      
      // Get user information from GitLab
      const userData = await this.getGitLabUserInfo(tokenData.access_token);

      // Save user data to database
      await this.database.saveUser(stateData.slackUserId, stateData.slackTeamId, {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      console.log(`✅ User ${userData.username} (${userData.email}) connected to Slack user ${stateData.slackUserId}`);

      // Return success page
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <div style="max-width: 500px; margin: 0 auto;">
              <h2 style="color: #27ae60;">✅ Successfully connected!</h2>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>GitLab account:</strong> ${userData.username}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
              </div>
              <p style="color: #666;">Now you will receive notifications about Merge Requests and mentions from GitLab in Slack!</p>
              <button onclick="window.close()" style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">
                Close window
              </button>
            </div>
          </body>
        </html>
      `);

    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2 style="color: #e74c3c;">❌ Server error</h2>
            <p>An error occurred while processing authorization</p>
            <p><a href="#" onclick="window.close()">Close window</a></p>
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
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to get access token');
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
      console.error('Error getting user information:', error.response?.data || error.message);
      throw new Error('Failed to get user information from GitLab');
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
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh token');
    }
  }

  cleanupExpiredStates() {
    const now = Date.now();
    const expiredStates = [];

    for (const [state, data] of this.oauthStates.entries()) {
      // Delete states older than 10 minutes
      if (now - data.timestamp > 10 * 60 * 1000) {
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => {
      this.oauthStates.delete(state);
    });
  }

  // Check token validity
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
