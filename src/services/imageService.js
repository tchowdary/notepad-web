import { Dropbox } from 'dropbox';

class ImageService {
  constructor() {
    this.dropbox = null;
    this.loadSettings();
  }

  loadSettings() {
    this.settings = {
      accessToken: localStorage.getItem('dropbox_access_token'),
    };

    if (this.settings.accessToken) {
      this.dropbox = new Dropbox({ accessToken: this.settings.accessToken });
    }
  }

  isConfigured() {
    return !!this.settings.accessToken;
  }

  setAccessToken(token) {
    localStorage.setItem('dropbox_access_token', token);
    this.loadSettings();
  }

  async uploadImage(file, filename) {
    if (!this.isConfigured()) {
      throw new Error('Dropbox is not configured. Please set access token first.');
    }

    try {
      // Upload file to Dropbox
      const response = await this.dropbox.filesUpload({
        path: `/images/${filename}`,
        contents: file,
      });

      // Create a shared link
      const shareResponse = await this.dropbox.sharingCreateSharedLink({
        path: response.result.path_display,
      });

      // Convert the shared link to a direct link
      // Dropbox shared links look like: https://www.dropbox.com/s/...?dl=0
      // We need to convert it to: https://dl.dropboxusercontent.com/s/...
      const directLink = shareResponse.result.url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '');

      return directLink;
    } catch (error) {
      console.error('Error uploading image to Dropbox:', error);
      throw error;
    }
  }
}

export default new ImageService();
