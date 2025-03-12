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

  // Check if a note needs to be synced based on lastModified and lastSynced timestamps
  shouldSyncNote(tab) {
    // Always sync if there's no lastSynced timestamp
    if (!tab.lastSynced) {
      return true;
    }
    
    // Check if the note has been modified since the last sync
    if (tab.lastModified && new Date(tab.lastModified) > new Date(tab.lastSynced)) {
      return true;
    }
    
    // Don't sync if the note hasn't been modified
    return false;
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
      // Check if the note needs to be synced
      if (!this.shouldSyncNote(tab)) {
        console.log(`Skipping sync for ${tab.name} - no changes since last sync`);
        return { id: tab.noteId, skipped: true };
      }

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
        
        return new Promise((resolve, reject) => {
          const tx = db.transaction(TABS_STORE, 'readwrite');
          const store = tx.objectStore(TABS_STORE);
          
          // Get the current tab
          const getRequest = store.get(tab.id);
          
          getRequest.onsuccess = (event) => {
            const currentTab = event.target.result;
            if (currentTab) {
              // Update the tab with the noteId from the API response
              const updatedTab = {
                ...currentTab,
                noteId: result.id,
                lastSynced: new Date().toISOString()
              };
              
              const putRequest = store.put(updatedTab);
              
              putRequest.onsuccess = () => {
                resolve(result);
              };
              
              putRequest.onerror = (error) => {
                console.error('Error updating tab in IndexedDB:', error);
                reject(error);
              };
            } else {
              resolve(result);
            }
          };
          
          getRequest.onerror = (error) => {
            console.error('Error getting tab from IndexedDB:', error);
            reject(error);
          };
          
          tx.onerror = (error) => {
            console.error('Transaction error:', error);
            reject(error);
          };
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
      return [];
    }
    
    try {
      // Open IndexedDB connection using our utility function
      const db = await openDB();
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(TABS_STORE, 'readonly');
        const store = tx.objectStore(TABS_STORE);
        
        const request = store.getAll();
        
        request.onsuccess = async (event) => {
          const tabs = event.target.result;
          
          // Filter tabs that need to be synced (have content and are not drawings)
          const tabsToSync = tabs.filter(tab => 
            tab.content && 
            tab.type !== 'excalidraw' && 
            tab.type !== 'tldraw'
          );
          
          // Sync each tab and collect results
          const syncResults = [];
          for (const tab of tabsToSync) {
            try {
              const result = await this.syncNote(tab);
              if (result && result.id) {
                syncResults.push({
                  tabId: tab.id,
                  noteId: result.id
                });
              } else if (result && result.skipped) {
                console.log(`Skipped syncing ${tab.name} - no changes since last sync`);
              }
            } catch (error) {
              console.error(`Error syncing tab ${tab.name}:`, error);
              // Continue with other tabs even if one fails
            }
          }
          
          resolve(syncResults);
        };
        
        request.onerror = (error) => {
          console.error('Error getting tabs from IndexedDB:', error);
          reject(error);
        };
        
        tx.onerror = (error) => {
          console.error('Transaction error:', error);
          reject(error);
        };
      });
    } catch (error) {
      console.error('Error syncing all notes:', error);
      return [];
    }
  }

  async getAllNotes(limit = null) {
    if (!this.isConfigured()) return [];

    try {
      let url = `${this.settings.proxyUrl}/api/notes`;
      if (limit) {
        url += `?limit=${limit}`;
      }

      const response = await fetch(url, {
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
      // Extract notes array from the response
      const notes = responseData && responseData.notes ? responseData.notes : [];
      return notes;
    } catch (error) {
      console.error('Error getting all notes:', error);
      return [];
    }
  }

  async searchNotes(searchTerm, searchType = 'name') {
    if (!this.isConfigured() || !searchTerm || searchTerm.length < 2) return [];

    try {
      const url = new URL(`${this.settings.proxyUrl}/api/notes`);
      
      // Use the correct parameter based on search type
    if (searchType === 'name') {
      url.searchParams.append('search', searchTerm);
    } else if (searchType === 'content') {
      url.searchParams.append('content', searchTerm);
    } else if (searchType === 'both') {
      url.searchParams.append('search', searchTerm);
      url.searchParams.append('content', searchTerm);
    }


      const response = await fetch(url.toString(), {
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
      // Extract notes array from the response
      const notes = responseData && responseData.notes ? responseData.notes : [];
      
      // If we're searching content, we need to decode the content
      if (searchType === 'content' || searchType === 'both') {
        return notes.map(note => {
          if (note.content) {
            try {
              note.content = decodeURIComponent(escape(atob(note.content)));
            } catch (e) {
              console.error('Error decoding note content:', e);
            }
          }
          return note;
        });
      }
      
      return notes;
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  async getNoteById(noteId) {
    if (!this.isConfigured() || !noteId) return null;

    try {
      const response = await fetch(`${this.settings.proxyUrl}/api/notes?id=${noteId}`, {
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
      // Extract the note from the response
      return responseData && responseData.note ? responseData.note : null;
    } catch (error) {
      console.error(`Error getting note with ID ${noteId}:`, error);
      return null;
    }
  }
}

export default new DbSyncService();
