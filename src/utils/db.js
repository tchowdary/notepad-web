export const DB_NAME = 'notepadDB';
export const DB_VERSION = 4;
export const TABS_STORE = 'tabs';
export const DRAWINGS_STORE = 'drawings';
export const TODO_STORE = 'todos';

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TABS_STORE)) {
        const store = db.createObjectStore(TABS_STORE, { keyPath: 'id' });
        // Add indexes for sync tracking
        store.createIndex('lastModified', 'lastModified', { unique: false });
        store.createIndex('lastSynced', 'lastSynced', { unique: false });
      } else {
        // Add indexes to existing store if upgrading from a previous version
        const store = event.currentTarget.transaction.objectStore(TABS_STORE);
        if (!store.indexNames.contains('lastModified')) {
          store.createIndex('lastModified', 'lastModified', { unique: false });
        }
        if (!store.indexNames.contains('lastSynced')) {
          store.createIndex('lastSynced', 'lastSynced', { unique: false });
        }
      }
      if (!db.objectStoreNames.contains(DRAWINGS_STORE)) {
        const store = db.createObjectStore(DRAWINGS_STORE, { keyPath: 'id' });
        store.createIndex('id', 'id', { unique: true });
      }
      if (!db.objectStoreNames.contains(TODO_STORE)) {
        db.createObjectStore(TODO_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveTabs = async (tabs) => {
  const db = await openDB();
  const tx = db.transaction(TABS_STORE, 'readwrite');
  const store = tx.objectStore(TABS_STORE);

  // Get existing tabs to compare content
  const existingTabsRequest = store.getAll();
  
  return new Promise((resolve, reject) => {
    existingTabsRequest.onsuccess = async () => {
      const existingTabs = existingTabsRequest.result;
      const existingTabsMap = new Map(existingTabs.map(tab => [tab.id, tab]));
      
      // Clear existing tabs
      await store.clear();
      
      const now = new Date().toISOString();
      
      // Add tabs, preserving lastModified if content hasn't changed
      const promises = tabs.map(tab => {
        const existingTab = existingTabsMap.get(tab.id);
        const lastModified = existingTab && existingTab.content === tab.content
          ? existingTab.lastModified
          : now;
          
        // Always preserve noteId and lastSynced from existing tab if they exist
        const noteId = tab.noteId || (existingTab ? existingTab.noteId : undefined);
        const lastSynced = tab.lastSynced || (existingTab ? existingTab.lastSynced : undefined);
        
        // Log for debugging
        if (noteId) {
          console.log(`Preserving noteId ${noteId} for tab ${tab.id} (${tab.name})`);
        }
        
        return store.add({
          ...tab,
          noteId,
          lastSynced,
          lastModified
        });
      });

      Promise.all(promises)
        .then(() => {
          resolve();
        })
        .catch(error => reject(error));
    };
    
    existingTabsRequest.onerror = () => reject(existingTabsRequest.error);
    tx.onerror = () => reject(tx.error);
  });
};

export const loadTabs = async () => {
  const db = await openDB();
  const tx = db.transaction(TABS_STORE, 'readonly');
  const store = tx.objectStore(TABS_STORE);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const tabs = request.result;
      resolve(tabs.length > 0 ? tabs : [{ id: 1, name: 'untitled.md', content: '', type: 'markdown' }]);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveDrawing = async (drawing) => {
  const db = await openDB();
  const tx = db.transaction(DRAWINGS_STORE, 'readwrite');
  const store = tx.objectStore(DRAWINGS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.put(drawing);
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = (error) => {
      console.error('Error saving drawing:', error); // Debug log
      reject(request.error);
    };
  });
};

export const loadDrawing = async (id) => {
  const db = await openDB();
  const tx = db.transaction(DRAWINGS_STORE, 'readonly');
  const store = tx.objectStore(DRAWINGS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = (error) => {
      console.error('Error loading drawing:', error); // Debug log
      reject(request.error);
    };
  });
};

export const deleteDrawing = async (id) => {
  const db = await openDB();
  const tx = db.transaction(DRAWINGS_STORE, 'readwrite');
  const store = tx.objectStore(DRAWINGS_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (error) => {
      reject(request.error);
    };
  });
};

export const saveTodoData = async (todoData) => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readwrite');
    const store = tx.objectStore(TODO_STORE);

    await new Promise((resolve, reject) => {
      const request = store.put({ id: 'todoData', data: todoData });
      
      request.onerror = (error) => {
        console.error('Error in IndexedDB save:', error);
        reject(error);
      };

      tx.onerror = (error) => {
        console.error('Transaction error:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Error in saveTodoData:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
};

export const loadTodoData = async () => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readonly');
    const store = tx.objectStore(TODO_STORE);

    const data = await new Promise((resolve, reject) => {
      const request = store.get('todoData');
      
      request.onsuccess = () => {
        const todoData = request.result?.data || {
          inbox: [],
          archive: [],
          projects: {}
        };
        resolve(todoData);
      };
      
      request.onerror = (error) => {
        console.error('Error loading todo data:', error);
        reject(error);
      };
    });
    
    return data;
  } catch (error) {
    console.error('Error in loadTodoData:', error);
    return {
      inbox: [],
      archive: [],
      projects: {}
    };
  } finally {
    if (db) {
      db.close();
    }
  }
};

/**
 * Updates tab noteIds in IndexedDB based on sync results
 * @param {Array} syncResults - Array of objects with tabId and noteId properties
 * @returns {Promise<void>}
 */
export const updateTabNoteIds = async (syncResults) => {
  if (!syncResults || syncResults.length === 0) {
    return;
  }
  
  let db;
  try {
    db = await openDB();
    
    // Process each sync result sequentially
    for (const syncResult of syncResults) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(TABS_STORE, 'readwrite');
        const store = tx.objectStore(TABS_STORE);
        
        const getRequest = store.get(syncResult.tabId);
        
        getRequest.onsuccess = (event) => {
          const tab = event.target.result;
          if (tab) {
            const updatedTab = {
              ...tab,
              noteId: syncResult.noteId,
              lastSynced: new Date().toISOString()
            };
            
            const putRequest = store.put(updatedTab);
            
            putRequest.onsuccess = () => {
              console.log(`Updated tab ${syncResult.tabId} with noteId ${syncResult.noteId} in IndexedDB`);
              resolve();
            };
            
            putRequest.onerror = (error) => {
              console.error('Error updating tab in IndexedDB:', error);
              reject(error);
            };
          } else {
            console.log(`Tab ${syncResult.tabId} not found in IndexedDB`);
            resolve(); // Resolve anyway to continue with other tabs
          }
        };
        
        getRequest.onerror = (error) => {
          console.error('Error getting tab from IndexedDB:', error);
          reject(error);
        };
        
        tx.oncomplete = () => {
          resolve();
        };
        
        tx.onerror = (error) => {
          console.error('Transaction error:', error);
          reject(error);
        };
      });
    }
    
    console.log('All tabs updated in IndexedDB');
  } catch (error) {
    console.error('Error updating tab noteIds in IndexedDB:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
};
