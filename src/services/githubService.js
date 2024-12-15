import { DB_NAME, DB_VERSION, TABS_STORE, openDB } from '../utils/db';

class GitHubService {
  constructor() {
    this.syncInterval = 30 * 60 * 1000; // 30 minutes
    this.loadSettings();
    this.startAutoSync();
  }

  loadSettings() {
    this.settings = {
      token: localStorage.getItem('github_token'),
      repo: localStorage.getItem('github_repo'),
      branch: localStorage.getItem('github_branch') || 'main'
    };
  }

  startAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
    
    this.autoSyncTimer = setInterval(() => {
      this.syncAllFiles();
    }, this.syncInterval);
  }

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  isConfigured() {
    const isConfigured = !!(this.settings.token && this.settings.repo);
    return isConfigured;
  }

  getFilePath(filename) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    let extension = '';
    
    // Handle file extensions
    if (!filename.includes('.')) {
      extension = '.md';
    } else if (filename.endsWith('.tldraw')) {
      extension = ''; // Don't add extension for .tldraw files
    }
    
    return `${year}/${month}/${filename}${extension}`;
  }

  shouldSyncFile(filename) {
    // Skip untitled.md files
    if (filename === 'untitled.md') {
      console.log(`Skipping sync for untitled file: ${filename}`);
      return false;
    }
    
    // Include .md and .tldraw files
    const shouldSync = filename.endsWith('.md') || filename.endsWith('.tldraw');
    console.log(`File ${filename} sync status:`, shouldSync);
    return shouldSync;
  }

  async uploadFile(filename, content) {
    if (!this.isConfigured() || !this.shouldSyncFile(filename)) return;

    const path = this.getFilePath(filename);
    const apiUrl = `https://api.github.com/repos/${this.settings.repo}/contents/${path}`;

    // Check if file exists
    let existingFile;
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${this.settings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        existingFile = await response.json();
      }
    } catch (error) {
      // File doesn't exist, continue with creation
    }

    const body = {
      message: `Update ${path}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: this.settings.branch
    };

    if (existingFile) {
      body.sha = existingFile.sha;
    }

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${this.settings.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Method to sync all files
  async syncAllFiles() {
    if (!this.isConfigured()) {
      console.log('GitHub not configured, skipping sync');
      return;
    }
    
    try {
      console.log('Starting sync process...');
      // Open IndexedDB connection using our utility function
      const db = await openDB();
      console.log('Database connection opened');

      // Get all tabs from the store
      const tx = db.transaction(TABS_STORE, 'readonly');
      const store = tx.objectStore(TABS_STORE);
      const tabs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      console.log('Retrieved tabs from database:', tabs.length);

      // Sync each file that meets our criteria
      let syncCount = 0;
      for (const tab of tabs) {
        console.log(`Processing tab: ${tab.name}`);
        if (this.shouldSyncFile(tab.name)) {
          try {
            await this.uploadFile(tab.name, tab.content);
            console.log(`Successfully synced file: ${tab.name}`);
            syncCount++;
          } catch (error) {
            console.error(`Failed to sync file ${tab.name}:`, error);
          }
        }
      }
      console.log(`Sync completed. Successfully synced ${syncCount} files`);
    } catch (error) {
      console.error('Error syncing files:', error);
      throw error; // Re-throw to be caught by the toolbar handler
    }
  }
}

export default new GitHubService();
