import { DB_NAME, DB_VERSION, TABS_STORE, TODO_STORE, openDB } from '../utils/db';

class ApiService {
  constructor() {
    this.settings = {
      url: '',
      apiKey: ''
    };
    this.loadSettings();
  }

  // Load settings from localStorage
  loadSettings() {
    this.settings = {
      url: localStorage.getItem('proxy_url') || '',
      apiKey: localStorage.getItem('proxy_key') || ''
    };
  }

  // Check if API is configured
  isConfigured() {
    // Reload settings to ensure we have the latest values
    this.loadSettings();
    return !!(this.settings.url && this.settings.apiKey);
  }

  // Check if auto-sync is enabled
  isAutoSyncEnabled() {
    return localStorage.getItem('api_auto_sync') !== 'false';
  }

  // We don't need these methods anymore since we're handling sync in App.jsx
  startAutoSync() {}
  stopAutoSync() {}

  // Create or update a note in the API
  async createOrUpdateNote(name, content, noteId = null) {
    if (!this.isConfigured()) {
      console.log('API not configured');
      return null;
    }

    try {
      // Encode content to base64 to handle special characters
      const contentBase64 = btoa(content);

      const response = await fetch(`${this.settings.url}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.apiKey
        },
        body: JSON.stringify({
          id: noteId,
          name: name,
          content: contentBase64
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create/update note: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating/updating note:', error);
      throw error;
    }
  }

  // Sync a single note with the API
  async syncNote(tab) {
    if (!this.isConfigured() || !this.shouldSyncNote(tab.name)) {
      return null;
    }

    try {
      // Check if we need to sync this note
      const needsSync = !tab.lastSynced || (tab.lastModified && this.compareDates(tab.lastModified, tab.lastSynced));
      
      if (!needsSync) {
        return null;
      }

      // Create or update the note
      const response = await this.createOrUpdateNote(tab.name, tab.content, tab.noteId);
      
      if (!response || !response.id) {
        return null;
      }
      
      // Update the tab with the note ID and lastSynced timestamp
      const db = await openDB();
      const tx = db.transaction(TABS_STORE, 'readwrite');
      const store = tx.objectStore(TABS_STORE);
      
      await store.put({
        ...tab,
        noteId: response.id,
        lastSynced: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error(`Failed to sync note ${tab.name}:`, error);
      return null;
    }
  }

  // Check if a note should be synced
  shouldSyncNote(filename) {
    // Skip untitled.md files
    if (filename.startsWith('Note') || filename.startsWith('Code') || filename.endsWith('.tldraw')) {
      return false;
    }
    
    // Skip temporary or system files
    if (filename.startsWith('.') || filename === 'untitled.md') {
      return false;
    }

    // Only sync markdown files and text files
    return filename.endsWith('.md') || filename.endsWith('.txt');
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

  // Get all notes from the API
  async getAllNotes() {
    if (!this.isConfigured()) return [];

    try {
      const response = await fetch(`${this.settings.url}/api/notes`, {
        method: 'GET',
        headers: {
          'x-api-key': this.settings.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get notes: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Check if the response has the expected structure
      if (!data || !Array.isArray(data)) {
        console.error('Invalid API response format:', data);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Error getting all notes:', error);
      return [];
    }
  }

  // Get available AI models from the API
  async getAvailableModels() {
    if (!this.isConfigured()) return [];

    try {
      const response = await fetch(`${this.settings.url}/api/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.settings.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get models: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Check if the response has the expected structure
      if (!data || !Array.isArray(data)) {
        console.error('Invalid API response format:', data);
        return [];
      }
      
      return data.map(model => ({
        nickname: model.nickname
      }));
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  // Send a message to the AI model
  async sendProxyMessage(modelName, message) {
    if (!this.isConfigured()) {
      throw new Error('API is not configured');
    }

    try {
      const response = await fetch(`${this.settings.url}/api/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.apiKey
        },
        body: JSON.stringify({
          model: modelName,
          message: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to send message: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getNoteById(id) {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.settings.url}/api/notes?id=${id}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.settings.apiKey
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(`Failed to get note: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      
      // Decode base64 content
      if (responseData && responseData.content) {
        responseData.content = decodeURIComponent(escape(atob(responseData.content)));
      }
      
      return responseData;
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  }

  async searchNotes(searchTerm) {
    if (!this.isConfigured()) return [];

    try {
      const response = await fetch(`${this.settings.url}/api/notes?search=${searchTerm}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.settings.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to search notes: ${errorData.message || response.statusText}`);
      }

      const responseData = await response.json();
      
      // Decode base64 content for each note
      if (Array.isArray(responseData)) {
        responseData.forEach(note => {
          if (note.content) {
            note.content = decodeURIComponent(escape(atob(note.content)));
          }
        });
      }
      
      return responseData;
    } catch (error) {
      console.error('Error searching notes:', error);
      return [];
    }
  }

  async getFileContent(path) {
    if (!this.isConfigured()) return null;

    try {
      // Extract the note name from the path
      const pathParts = path.split('/');
      const noteName = pathParts[pathParts.length - 1];
      
      // Search for the note by name
      const notes = await this.searchNotes(noteName);
      
      // Find the exact match
      const exactMatch = notes.find(note => note.name === noteName);
      
      if (exactMatch) {
        return exactMatch.content;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting file content:', error);
      return null;
    }
  }

  async syncAllNotes() {
    if (!this.isConfigured()) {
      return;
    }
    
    try {
      // Open IndexedDB connection
      const db = await openDB();

      // Get todos from the todo store
      const todoTx = db.transaction(TODO_STORE, 'readonly');
      const todoStore = todoTx.objectStore(TODO_STORE);
      const todoRequest = todoStore.get('todoData');
      
      todoRequest.onsuccess = async () => {
        const todoData = todoRequest.result?.data;
        if (todoData) {
          await this.syncTodos(todoData);
        }
      };

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
          try {
            const result = await this.syncNote(tab);
            if (result) {
              syncCount++;
            }
          } catch (error) {
            console.error(`Failed to sync note ${tab.name}:`, error);
          }
        }
      }
      
      console.log(`Synced ${syncCount} notes to API`);
    } catch (error) {
      console.error('Error in syncAllNotes:', error);
    }
  }

  // Import notes from the API to local IndexedDB
  async importNotesFromApi() {
    if (!this.isConfigured()) return 0;

    try {
      // Get all notes from the API
      const apiNotes = await this.getAllNotes();
      if (!apiNotes || !Array.isArray(apiNotes) || apiNotes.length === 0) {
        console.log('No notes found in the API');
        return 0;
      }

      console.log(`Found ${apiNotes.length} notes in the API`);

      // Open IndexedDB connection
      const db = await openDB();
      const tx = db.transaction(TABS_STORE, 'readwrite');
      const store = tx.objectStore(TABS_STORE);

      // Get all existing tabs
      const existingTabs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });

      // Create a map of existing tabs by name for quick lookup
      const existingTabsByName = new Map();
      existingTabs.forEach(tab => {
        existingTabsByName.set(tab.name, tab);
      });

      // Create a map of existing tabs by noteId for quick lookup
      const existingTabsByNoteId = new Map();
      existingTabs.forEach(tab => {
        if (tab.noteId) {
          existingTabsByNoteId.set(tab.noteId, tab);
        }
      });

      // Process each API note
      let importCount = 0;
      for (const apiNote of apiNotes) {
        // First check if we have a tab with this noteId
        let existingTab = existingTabsByNoteId.get(apiNote.id);
        
        // If not found by ID, try by name
        if (!existingTab) {
          existingTab = existingTabsByName.get(apiNote.name);
        }
        
        // Decode the base64 content
        const content = apiNote.content ? 
          decodeURIComponent(escape(atob(apiNote.content))) : 
          '';
        
        if (existingTab) {
          // Update existing tab if the API note is newer
          const apiNoteDate = new Date(apiNote.updatedAt || apiNote.createdAt);
          const tabDate = new Date(existingTab.lastModified || 0);
          
          if (apiNoteDate > tabDate) {
            await store.put({
              ...existingTab,
              content: content,
              noteId: apiNote.id, // Store the note ID for future updates
              lastModified: apiNoteDate.toISOString(),
              lastSynced: new Date().toISOString()
            });
            importCount++;
            console.log(`Updated existing note: ${apiNote.name}`);
          }
        } else {
          // Create a new tab for the API note
          const newId = Math.max(...existingTabs.map(tab => tab.id || 0), 0) + 1;
          const isMarkdown = apiNote.name.toLowerCase().endsWith('.md') || apiNote.name.toLowerCase().endsWith('.markdown');
          
          await store.add({
            id: newId,
            name: apiNote.name,
            content: content,
            type: 'markdown',
            editorType: isMarkdown ? 'tiptap' : 'codemirror',
            noteId: apiNote.id, // Store the note ID for future updates
            lastModified: new Date(apiNote.updatedAt || apiNote.createdAt).toISOString(),
            lastSynced: new Date().toISOString()
          });
          importCount++;
          console.log(`Imported new note: ${apiNote.name}`);
        }
      }

      console.log(`Imported ${importCount} notes from API`);
      return importCount;
    } catch (error) {
      console.error('Error importing notes from API:', error);
      throw error;
    }
  }

  async syncTodos(tasks) {
    if (!this.isConfigured()) return;

    try {
      // Format todo content
      let content = `# Todo List\n\nLast updated: ${new Date().toISOString()}\n\n`;

      // Handle inbox tasks
      if (tasks.inbox && tasks.inbox.length > 0) {
        content += '## Inbox\n\n';
        content += tasks.inbox.map(task => {
          const status = task.completed ? '[x]' : '[ ]';
          const dueDate = task.dueDate ? ` (Due: ${task.dueDate})` : '';
          const notes = task.notes ? `\n  Notes: ${task.notes}` : '';
          return `- ${status} ${task.text}${dueDate}${notes}`;
        }).join('\n');
        content += '\n\n';
      }

      // Handle project tasks
      if (tasks.projects) {
        Object.entries(tasks.projects).forEach(([project, projectTasks]) => {
          if (projectTasks.length > 0) {
            content += `## ${project}\n\n`;
            content += projectTasks.map(task => {
              const status = task.completed ? '[x]' : '[ ]';
              const dueDate = task.dueDate ? ` (Due: ${task.dueDate})` : '';
              const notes = task.notes ? `\n  Notes: ${task.notes}` : '';
              return `- ${status} ${task.text}${dueDate}${notes}`;
            }).join('\n');
            content += '\n\n';
          }
        });
      }

      // Handle archived tasks
      if (tasks.archive && tasks.archive.length > 0) {
        content += '## Archive\n\n';
        content += tasks.archive.map(task => {
          const status = task.completed ? '[x]' : '[ ]';
          const dueDate = task.dueDate ? ` (Due: ${task.dueDate})` : '';
          const notes = task.notes ? `\n  Notes: ${task.notes}` : '';
          return `- ${status} ${task.text}${dueDate}${notes}`;
        }).join('\n');
        content += '\n\n';
      }
      
      // Get the todo tab from IndexedDB to check if it has a noteId
      const db = await openDB();
      const tx = db.transaction(TABS_STORE, 'readonly');
      const store = tx.objectStore(TABS_STORE);
      const todoTabs = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const tabs = request.result;
          const todoTab = tabs.find(tab => tab.name === 'Todo');
          resolve(todoTab ? [todoTab] : []);
        };
      });
      
      const todoTab = todoTabs[0];
      const todoNoteId = todoTab?.noteId;
      
      // Create or update the todo note
      const response = await this.createOrUpdateNote('Todo', content, todoNoteId);
      
      // Update the todo tab with the note ID if it exists
      if (todoTab) {
        const updateTx = db.transaction(TABS_STORE, 'readwrite');
        const updateStore = updateTx.objectStore(TABS_STORE);
        
        await updateStore.put({
          ...todoTab,
          noteId: response.id,
          lastSynced: new Date().toISOString()
        });
      }
      
      console.log('Synced todos to API with ID:', response.id);
      return response;
    } catch (error) {
      console.error('Failed to sync todos:', error);
      throw error;
    }
  }
}

export default new ApiService();
