import { Dropbox } from 'dropbox';

class DropboxAuthService {
  constructor() {
    this.redirectUri = this.getRedirectUri();
    this.loadCredentials();
  }

  getRedirectUri() {
    // Check if we're on the production domain
    if (window.location.hostname === 'tchowdary.github.io') {
      return 'https://tchowdary.github.io/auth/callback';
    }
    // For local development
    return `${window.location.origin}/auth/callback`;
  }

  loadCredentials() {
    this.clientId = localStorage.getItem('dropbox_client_id');
    this.clientSecret = localStorage.getItem('dropbox_client_secret');
    this.initializeDropbox();
  }

  initializeDropbox() {
    this.dropbox = new Dropbox({ clientId: this.clientId });
  }

  setCredentials(clientId, clientSecret) {
    localStorage.setItem('dropbox_client_id', clientId);
    localStorage.setItem('dropbox_client_secret', clientSecret);
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.initializeDropbox();
  }

  getAuthUrl() {
    if (!this.clientId) {
      throw new Error('Dropbox client ID not configured');
    }
    return this.dropbox.auth.getAuthenticationUrl(this.redirectUri, null, 'code', 'offline', null, 'none', false);
  }

  async getTokenFromCode(code) {
    // If we already have a valid token, don't process the code again
    if (this.isAuthenticated()) {
      return localStorage.getItem('dropbox_access_token');
    }

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to get token');
      }

      this.saveTokens(data);
      this.dropbox = new Dropbox({ accessToken: data.access_token });
      return data.access_token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('dropbox_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to refresh token');
      }

      this.saveTokens(data);
      this.dropbox = new Dropbox({ accessToken: data.access_token });
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  saveTokens(tokenData) {
    localStorage.setItem('dropbox_access_token', tokenData.access_token);
    localStorage.setItem('dropbox_refresh_token', tokenData.refresh_token);
    localStorage.setItem('dropbox_token_expiry', Date.now() + (tokenData.expires_in * 1000));
  }

  async getValidToken() {
    const accessToken = localStorage.getItem('dropbox_access_token');
    const tokenExpiry = localStorage.getItem('dropbox_token_expiry');

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // If token is expired or will expire in the next 5 minutes
    if (Date.now() + 300000 > Number(tokenExpiry)) {
      return this.refreshToken();
    }

    return accessToken;
  }

  isAuthenticated() {
    return !!localStorage.getItem('dropbox_access_token');
  }

  logout() {
    localStorage.removeItem('dropbox_access_token');
    localStorage.removeItem('dropbox_refresh_token');
    localStorage.removeItem('dropbox_token_expiry');
    localStorage.removeItem('dropbox_client_id');
    localStorage.removeItem('dropbox_client_secret');
    this.clientId = null;
    this.clientSecret = null;
    this.dropbox = null;
  }

  hasCredentials() {
    return !!(this.clientId && this.clientSecret);
  }
}

export default new DropboxAuthService();
