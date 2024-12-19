const DB_NAME = 'chatDB';
const DB_VERSION = 1;
const STORE_NAME = 'chatSessions';
const MAX_SESSIONS = 10;

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
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('lastUpdated', 'lastUpdated');
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
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

        // Remove oldest session if we're at the limit
        if (allSessions.length >= MAX_SESSIONS && !allSessions.find(s => s.id === session.id)) {
          const oldestSession = allSessions[allSessions.length - 1];
          store.delete(oldestSession.id);
        }

        const request = store.put(session);

        request.onsuccess = () => resolve(session);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving session:', error);
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
