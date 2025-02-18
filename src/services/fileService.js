import { Dropbox } from 'dropbox';

class FileService {
  constructor() {
    this.dropbox = null;
    this.loadSettings();
  }

  loadSettings() {
    this.settings = {
      refreshToken: localStorage.getItem('dropbox_refresh_token'),
      accessToken: localStorage.getItem('dropbox_access_token'),
      clientId: localStorage.getItem('dropbox_client_id'),
      clientSecret: localStorage.getItem('dropbox_client_secret'),
    };

    if (this.settings.accessToken) {
      this.dropbox = new Dropbox({ accessToken: this.settings.accessToken });
    }
  }

  isConfigured() {
    return !!(this.settings.refreshToken && this.settings.clientId && this.settings.clientSecret);
  }

  async generateAccessToken() {
    if (!this.settings.refreshToken || !this.settings.clientId || !this.settings.clientSecret) {
      throw new Error('Dropbox configuration incomplete');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', this.settings.refreshToken);
    params.append('client_id', this.settings.clientId);
    params.append('client_secret', this.settings.clientSecret);

    try {
      const response = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      this.setAccessToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  setRefreshToken(token) {
    localStorage.setItem('dropbox_refresh_token', token);
    this.loadSettings();
  }

  setClientCredentials(clientId, clientSecret) {
    localStorage.setItem('dropbox_client_id', clientId);
    localStorage.setItem('dropbox_client_secret', clientSecret);
    this.loadSettings();
  }

  setAccessToken(token) {
    localStorage.setItem('dropbox_access_token', token);
    this.loadSettings();
  }

  async uploadFile(file, customPath = null) {
    if (!this.isConfigured()) {
      throw new Error('Dropbox is not configured. Please set refresh token and client credentials first.');
    }

    try {
      // Ensure we have a valid access token
      if (!this.settings.accessToken) {
        await this.generateAccessToken();
      }

      // Generate a unique filename by appending timestamp to original name
      const timestamp = Date.now();
      const originalName = file.name || `file.${file.type.split('/')[1]}`;
      const fileNameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const fileExtension = originalName.substring(originalName.lastIndexOf('.'));
      const filename = `${fileNameWithoutExt}-${timestamp}${fileExtension}`;
      
      // Use custom path if provided, otherwise determine folder based on file type
      const folder = file.type.startsWith('image/') ? 'images' : 'documents';
      const filePath = customPath || `/${folder}/${filename}`;

      // Upload file to Dropbox
      try {
        const response = await this.dropbox.filesUpload({
          path: filePath,
          contents: file,
        });

        // Create a shared link
        const shareResponse = await this.dropbox.sharingCreateSharedLink({
          path: response.result.path_display,
        });

        // Convert the shared link to a direct link
        const directLink = shareResponse.result.url
          .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
          .replace('?dl=0', '');

        return {
          url: directLink,
          filename: filename,
          path: response.result.path_display,
          type: file.type
        };
      } catch (error) {
        if (error.status === 401) {
          // Access token expired, generate new one and retry
          await this.generateAccessToken();
          return this.uploadFile(file, customPath);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error uploading to Dropbox:', error);
      throw error;
    }
  }
}

export default new FileService();
