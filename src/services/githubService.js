class GitHubService {
  constructor() {
    this.syncInterval = 30 * 60 * 1000; // 30 minutes
    this.loadSettings();
  }

  loadSettings() {
    this.settings = {
      token: localStorage.getItem('github_token'),
      repo: localStorage.getItem('github_repo'),
      branch: localStorage.getItem('github_branch') || 'main'
    };
  }

  isConfigured() {
    return !!(this.settings.token && this.settings.repo);
  }

  getFilePath(filename) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const extension = filename.includes('.') ? '' : '.md';
    return `${year}/${month}/${filename}${extension}`;
  }

  async uploadFile(filename, content) {
    if (!this.isConfigured()) return;

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
}

export default new GitHubService();
