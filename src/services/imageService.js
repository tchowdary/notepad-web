import { Dropbox } from 'dropbox';
import dropboxAuthService from './dropboxAuthService';

class ImageService {
  constructor() {
    this.dropbox = null;
    this.loadSettings();
  }

  async loadSettings() {
    try {
      if (dropboxAuthService.isAuthenticated()) {
        const token = await dropboxAuthService.getValidToken();
        this.dropbox = new Dropbox({ accessToken: token });
      }
    } catch (error) {
      console.error('Error loading Dropbox settings:', error);
    }
  }

  isConfigured() {
    return dropboxAuthService.isAuthenticated();
  }

  async uploadImage(file, filename) {
    if (!this.isConfigured()) {
      throw new Error('Dropbox is not configured. Please authenticate first.');
    }

    try {
      // Ensure we have a valid token
      await this.loadSettings();

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
      const directLink = shareResponse.result.url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '');

      return directLink;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}

export default new ImageService();
