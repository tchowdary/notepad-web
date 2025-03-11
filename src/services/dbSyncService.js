import { DB_NAME, DB_VERSION, TABS_STORE, openDB } from '../utils/db';

class DbSyncService {
  constructor() {
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.loadSettings();
    this.startAutoSync();
  }

  loadSettings() {
    this.settings = {
      proxyUrl: localStorage.getItem('proxy_url'),
      proxyKey: localStorage.getItem('proxy_key')
    };
  }

  startAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }
    
    this.autoSyncTimer = setInterval(() => {
      this.syncAllNotes();
    }, this.syncInterval);
  }

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  isConfigured() {
    const isConfigured = !!(this.settings.proxyUrl && this.settings.proxyKey);
    return isConfigured;
  }

  shouldSyncNote(filename) {
    // Skip untitled.md files and temporary notes
    if (filename.startsWith('Note') || filename.startsWith('Code') || filename.endsWith('.tldraw')) {
      return false;
    }
    
    // Skip Todo file (handled separately)
    if (filename === 'Todo') {
      return false;
    }
    
    return true;
  }

  // Helper function to safely parse dates and compare them
  compareDates(date1, date2) {
    try {
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      return d1 > d2;
    } catch (error) {
      console.error('Error comparing dates:', error, { date1, date2 });
      return true; // If there's an error, sync to be safe
    }
  }

  async createNote(name, content) {
    if (!this.isConfigured()) return null;

    try {
      // Encode content to base64
      const contentBase64 = btoa(unescape(encodeURIComponent(content)));
      
      const response = await fetch(`${this.settings.proxyUrl}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.proxyKey
        },
        body: JSON.stringify({
          name: name,
          content: contentBase64
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Create note error:', errorData);
        throw new Error(`Failed to create note: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  async updateNote(id, name, content) {
    if (!this.isConfigured()) return null;

    try {
      // Encode content to base64
      const contentBase64 = btoa(unescape(encodeURIComponent(content)));
      
      const response = await fetch(`${this.settings.proxyUrl}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.proxyKey
        },
        body: JSON.stringify({
          id: id,
          name: name,
          content: contentBase64
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update note error:', errorData);
        throw new Error(`Failed to update note: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  async syncNote(tab) {
    if (!this.isConfigured()) return;

    try {
      // If the note has a noteId, update it, otherwise create a new note
      let result;
      if (tab.noteId) {
        result = await this.updateNote(tab.noteId, tab.name, tab.content);
      } else {
        result = await this.createNote(tab.name, tab.content);
      }

      // Update the tab with the noteId and lastSynced timestamp
      if (result && result.id) {
        const db = await openDB();
        const tx = db.transaction(TABS_STORE, 'readwrite');
        const store = tx.objectStore(TABS_STORE);
        
        await store.put({
          ...tab,
          noteId: result.id,
          lastSynced: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error syncing note ${tab.name}:`, error);
      throw error;
    }
  }

  async syncAllNotes() {
    if (!this.isConfigured()) {
      return;
    }
    
    try {
      // Open IndexedDB connection using our utility function
      const db = await openDB();

      // Get all tabs from the store
      const tx = db.transaction(TABS_STORE, 'readonly');
      const store = tx.objectStore(TABS_STORE);
      const tabs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      // Sync each note that meets our criteria
      let syncCount = 0;
      for (const tab of tabs) {
        if (this.shouldSyncNote(tab.name)) {
          const needsSync = !tab.lastSynced || (tab.lastModified && this.compareDates(tab.lastModified, tab.lastSynced));
          
          console.log(`Note ${tab.name} sync status:`, {
            lastModified: tab.lastModified,
            lastSynced: tab.lastSynced,
            needsSync
          });

          if (needsSync) {
            try {
              await this.syncNote(tab);
              syncCount++;
              console.log(`Synced ${tab.name} to database`);
            } catch (error) {
              console.error(`Failed to sync note ${tab.name}:`, error);
            }
          } else {
            console.log(`Skipping ${tab.name} - no changes since last sync`);
          }
        }
      }
      
      console.log(`Synced ${syncCount} notes to database`);
    } catch (error) {
      console.error('Error in syncAllNotes:', error);
    }
  }

  async searchNotes(searchTerm) {
    if (!this.isConfigured() || !searchTerm || searchTerm.length < 4) return [];

    try {
      const response = await fetch(`${this.settings.proxyUrl}/api/notes?search=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'x-api-key': this.settings.proxyKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Search notes error:', errorData);
        throw new Error(`Failed to search notes: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  }

  async getAllNotes() {
    if (!this.isConfigured()) return [];

    try {
      const response = await fetch(`${this.settings.proxyUrl}/api/notes`, {
        headers: {
          'x-api-key': this.settings.proxyKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Get all notes error:', errorData);
        throw new Error(`Failed to get all notes: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error getting all notes:', error);
      throw error;
    }
  }

  async getNoteById(id) {
    if (!this.isConfigured() || !id) return null;

    try {
      const response = await fetch(`${this.settings.proxyUrl}/api/notes?id=${encodeURIComponent(id)}`, {
        headers: {
          'x-api-key': this.settings.proxyKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Get note by ID error:', errorData);
        throw new Error(`Failed to get note: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('Error getting note by ID:', error);
      throw error;
    }
  }
}

export default new DbSyncService();
