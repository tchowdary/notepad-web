export const DB_NAME = 'notepadDB';
export const DB_VERSION = 5; // Increment version to trigger database upgrade
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
      
      // Update TODO_STORE to use task ID as keyPath
      if (!db.objectStoreNames.contains(TODO_STORE)) {
        const store = db.createObjectStore(TODO_STORE, { keyPath: 'id' });
        // Add indexes for querying tasks by list
        store.createIndex('list', 'list', { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
      } else if (event.oldVersion < 5) {
        // If upgrading from a previous version, delete and recreate the store
        db.deleteObjectStore(TODO_STORE);
        const store = db.createObjectStore(TODO_STORE, { keyPath: 'id' });
        store.createIndex('list', 'list', { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
        
        // We'll migrate the data in the application code after upgrade
        console.log('Todo store upgraded to individual task storage');
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
        
        // // Log for debugging
        // if (noteId) {
        //   console.log(`Preserving noteId ${noteId} for tab ${tab.id} (${tab.name})`);
        // }
        
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

// Save a single todo task
export const saveTodoTask = async (task) => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readwrite');
    const store = tx.objectStore(TODO_STORE);

    return await new Promise((resolve, reject) => {
      const request = store.put(task);
      
      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (error) => {
        console.error('Error saving todo task:', error);
        reject(error);
      };

      tx.onerror = (error) => {
        console.error('Transaction error:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Error in saveTodoTask:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
};

// Delete a todo task
export const deleteTodoTask = async (taskId) => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readwrite');
    const store = tx.objectStore(TODO_STORE);

    return await new Promise((resolve, reject) => {
      const request = store.delete(taskId);
      
      request.onsuccess = () => {
        resolve();
      };

      request.onerror = (error) => {
        console.error('Error deleting todo task:', error);
        reject(error);
      };
    });
  } catch (error) {
    console.error('Error in deleteTodoTask:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
};

// Save multiple todo tasks in a single transaction
export const saveTodoTasks = async (tasks) => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readwrite');
    const store = tx.objectStore(TODO_STORE);

    const promises = tasks.map(task => {
      return new Promise((resolve, reject) => {
        const request = store.put(task);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (error) => reject(error);
      });
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error in saveTodoTasks:', error);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
};

// Save all todo data - for backward compatibility and bulk operations
export const saveTodoData = async (todoData) => {
  try {
    // Extract all tasks from the todoData structure
    const tasks = [
      ...todoData.inbox,
      ...todoData.archive,
      ...Object.values(todoData.projects || {}).flat()
    ];
    
    // Save all tasks individually
    await saveTodoTasks(tasks);
    
    // Also save a metadata object to track lists and projects
    await saveTodoTask({
      id: 'todoMetadata',
      type: 'metadata',
      projects: Object.keys(todoData.projects || {})
    });
    
    return true;
  } catch (error) {
    console.error('Error in saveTodoData:', error);
    throw error;
  }
};

// Load all todo data and organize it into the expected structure
export const loadTodoData = async () => {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(TODO_STORE, 'readonly');
    const store = tx.objectStore(TODO_STORE);

    // Get all tasks
    const tasks = await new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = (error) => {
        console.error('Error loading todo tasks:', error);
        reject(error);
      };
    });
    
    // Check if we need to migrate from old format
    const oldFormatData = tasks.find(item => item.id === 'todoData');
    if (oldFormatData && oldFormatData.data) {
      console.log('Migrating from old todo data format');
      // Delete the old format data
      await deleteTodoTask('todoData');
      // Save using the new format
      await saveTodoData(oldFormatData.data);
      // Reload tasks after migration
      return await loadTodoData();
    }
    
    // Extract metadata
    const metadata = tasks.find(task => task.id === 'todoMetadata') || { projects: [] };
    
    // Filter out metadata from regular tasks
    const regularTasks = tasks.filter(task => task.id !== 'todoMetadata' && task.type !== 'metadata');
    
    // Organize tasks into the expected structure
    const todoData = {
      inbox: regularTasks.filter(task => task.list === 'inbox'),
      archive: regularTasks.filter(task => task.list === 'archive'),
      projects: {}
    };
    
    // Organize project tasks
    metadata.projects.forEach(project => {
      todoData.projects[project] = regularTasks.filter(task => task.list === project);
    });
    
    return todoData;
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
  
  try {
    const db = await openDB();
    
    // Process each sync result one by one
    for (const syncResult of syncResults) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(TABS_STORE, 'readwrite');
        const store = tx.objectStore(TABS_STORE);
        
        // First try to find the tab by ID
        const getRequest = store.get(syncResult.tabId);
        
        getRequest.onsuccess = (event) => {
          const tab = event.target.result;
          
          if (tab) {
            // Update the tab with the noteId from the sync result
            const updatedTab = {
              ...tab,
              noteId: syncResult.noteId,
              lastSynced: new Date().toISOString()
            };
            
            const putRequest = store.put(updatedTab);
            
            putRequest.onsuccess = () => {
              //console.log(`Updated tab ${syncResult.tabId} with noteId ${syncResult.noteId} in IndexedDB`);
              resolve();
            };
            
            putRequest.onerror = (error) => {
              reject(error);
            };
          } else if (syncResult.tabName) {
            // If tab not found by ID but we have the name, try to find it by name
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = (event) => {
              const allTabs = event.target.result;
              const tabByName = allTabs.find(t => t.name === syncResult.tabName);
              
              if (tabByName) {
                // Update the tab with the noteId from the sync result
                const updatedTab = {
                  ...tabByName,
                  noteId: syncResult.noteId,
                  lastSynced: new Date().toISOString()
                };
                
                const putRequest = store.put(updatedTab);
                
                putRequest.onsuccess = () => {
                  console.log(`Updated tab ${tabByName.id} (by name: ${syncResult.tabName}) with noteId ${syncResult.noteId} in IndexedDB`);
                  resolve();
                };
                
                putRequest.onerror = (error) => {
                  reject(error);
                };
              } else {
                //console.log(`Tab ${syncResult.tabId} not found in IndexedDB (also tried by name: ${syncResult.tabName})`);
                resolve(); // Resolve anyway to continue with other tabs
              }
            };
            
            getAllRequest.onerror = (error) => {
              reject(error);
            };
          } else {
            //console.log(`Tab ${syncResult.tabId} not found in IndexedDB`);
            resolve(); // Resolve anyway to continue with other tabs
          }
        };
        
        getRequest.onerror = (error) => {
          reject(error);
        };
        
        tx.onerror = (error) => {
          reject(error);
        };
      });
    }
    
    //console.log('All tabs updated in IndexedDB');
  } catch (error) {
    console.error('Error updating tab noteIds in IndexedDB:', error);
    throw error;
  }
};
