const DB_NAME = 'notepadDB';
const DB_VERSION = 1;
const TABS_STORE = 'tabs';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TABS_STORE)) {
        db.createObjectStore(TABS_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveTabs = async (tabs) => {
  const db = await openDB();
  const tx = db.transaction(TABS_STORE, 'readwrite');
  const store = tx.objectStore(TABS_STORE);

  // Clear existing tabs
  await store.clear();
  
  // Add all tabs
  const promises = tabs.map(tab => store.add(tab));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
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
      resolve(tabs.length > 0 ? tabs : [{ id: 1, name: 'untitled.md', content: '' }]);
    };
    request.onerror = () => reject(request.error);
  });
};
