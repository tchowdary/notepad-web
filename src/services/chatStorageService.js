const DB_NAME = 'chatDB';
const DB_VERSION = 3;  // Incrementing version to add title field
const STORE_NAME = 'chatSessions';
//const MAX_SESSIONS = 500;

class ChatStorageService {
  constructor() {
    this.dbPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };

      request.onupgradeneeded = (event) => {
        console.log('Upgrading chat database from version', event.oldVersion, 'to', event.newVersion);
        const db = event.target.result;
        
        // For a fresh database (version 0)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log('Creating new chat sessions store');
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('lastUpdated', 'lastUpdated');
          store.createIndex('lastSynced', 'lastSynced');
        } 
        // For upgrading from version 1 to 2
        else if (event.oldVersion === 1) {
          console.log('Adding lastSynced index to existing store');
          const store = event.currentTarget.transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('lastSynced')) {
            store.createIndex('lastSynced', 'lastSynced');
            
            // Update all existing records to initialize lastSynced
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const records = getAllRequest.result;
              records.forEach(record => {
                const updatedRecord = {
                  ...record,
                  lastSynced: undefined // Initialize as undefined to force a sync
                };
                store.put(updatedRecord);
              });
            };
          }
        }
        // For upgrading to version 3
        else if (event.oldVersion === 2) {
          console.log('Adding title field to existing store');
          // No need to add an index for title since we don't query by it
          const store = event.currentTarget.transaction.objectStore(STORE_NAME);
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const records = getAllRequest.result;
            records.forEach(record => {
              const updatedRecord = {
                ...record,
                title: undefined // Initialize title as undefined
              };
              store.put(updatedRecord);
            });
          };
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        console.log('Successfully opened chat database version:', db.version);
        resolve(db);
      };
    });
  }

  async getDB() {
    return await this.dbPromise;
  }

  async getAllSessions() {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const sessions = request.result;
          resolve(sessions.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated)));
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  async saveSession(session) {
    try {
      const db = await this.getDB();
      const allSessions = await this.getAllSessions();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // First try to get the existing session to preserve lastSynced
        const getRequest = store.get(session.id);
        
        getRequest.onsuccess = () => {
          const existingSession = getRequest.result;
          
          // Prepare the session to save
          const sessionToSave = {
            ...session,
            // Only update lastUpdated if not provided
            lastUpdated: session.lastUpdated || new Date().toISOString()
          };

          // If there's an existing session, preserve its lastSynced value
          if (existingSession && existingSession.lastSynced) {
            sessionToSave.lastSynced = existingSession.lastSynced;
          }

          // Remove oldest session if we're at the limit
          // if (allSessions.length >= MAX_SESSIONS && !allSessions.find(s => s.id === session.id)) {
          //   const oldestSession = allSessions[allSessions.length - 1];
          //   store.delete(oldestSession.id);
          // }

          // Save the updated session
          const putRequest = store.put(sessionToSave);
          putRequest.onsuccess = () => {
            console.log('Saved chat session with data:', sessionToSave);
            resolve(sessionToSave);
          };
          putRequest.onerror = (error) => {
            console.error('Error saving chat session:', error);
            reject(putRequest.error);
          };
        };

        getRequest.onerror = (error) => {
          console.error('Error getting existing chat session:', error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('Error in saveSession:', error);
      throw error;
    }
  }

  async getSession(id) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async deleteSession(id) {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}

export const chatStorage = new ChatStorageService();
