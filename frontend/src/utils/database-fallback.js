/**
 * Client-side database fallback mechanisms
 * Provides local storage when backend database is unavailable
 * Uses native browser storage APIs for maximum compatibility
 * 
 * This implementation uses a multi-layered fallback approach:
 * 1. IndexedDB (primary storage) - persistent, structured, high capacity
 * 2. localStorage (fallback) - persistent but limited size
 * 3. Memory storage (last resort) - non-persistent but always available
 */

// Database configuration
const DB_NAME = 'coder_fallback_db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CODE_SNIPPETS: 'code_snippets',
  FILES: 'files',
  PROJECTS: 'projects',
  SETTINGS: 'settings',
  EXECUTION_HISTORY: 'execution_history',
  API_QUEUE: 'api_queue', // Add API queue store
};

// Maximum age for cached data in milliseconds
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,  // 5 minutes
  MEDIUM: 60 * 60 * 1000, // 1 hour
  LONG: 24 * 60 * 60 * 1000, // 1 day
};

// Storage availability flags - will be set during initialization
let hasIndexedDB = false;
let hasLocalStorage = false;
let hasMemoryFallback = true; // Always available as last resort
let memoryStorage = {}; // In-memory fallback storage

/**
 * Check if IndexedDB is available and working
 * @returns {Promise<boolean>}
 */
async function checkIndexedDBSupport() {
  if (!window.indexedDB) return false;
  
  try {
    // Try to open the actual database to check support and initialize
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    return new Promise((resolve) => {
      request.onerror = () => resolve(false);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CODE_SNIPPETS)) {
          const codeStore = db.createObjectStore(STORES.CODE_SNIPPETS, { keyPath: 'id' });
          codeStore.createIndex('language', 'language', { unique: false });
          codeStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.FILES)) {
          const filesStore = db.createObjectStore(STORES.FILES, { keyPath: 'path' });
          filesStore.createIndex('projectId', 'projectId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectsStore.createIndex('name', 'name', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains(STORES.EXECUTION_HISTORY)) {
          const historyStore = db.createObjectStore(STORES.EXECUTION_HISTORY, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          historyStore.createIndex('language', 'language', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains(STORES.API_QUEUE)) {
          const apiQueueStore = db.createObjectStore(STORES.API_QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          apiQueueStore.createIndex('method', 'method', { unique: false });
          apiQueueStore.createIndex('url', 'url', { unique: false });
          apiQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        db.close();
        resolve(true);
      };
    });
  } catch (e) {
    return false;
  }
}

/**
 * Check if localStorage is available and working
 * @returns {boolean}
 */
function checkLocalStorageSupport() {
  if (!window.localStorage) return false;
  
  try {
    // Try to write and read from localStorage
    const testKey = '_test_ls_support';
    localStorage.setItem(testKey, 'test');
    const result = localStorage.getItem(testKey) === 'test';
    localStorage.removeItem(testKey);
    return result;
  } catch (e) {
    return false;
  }
}

/**
 * Initialize the fallback database system
 * This checks available storage mechanisms and configures the system accordingly
 */
export async function initFallbackDatabase() {
  try {
    // Check what storage mechanisms are available
    hasIndexedDB = await checkIndexedDBSupport();
    hasLocalStorage = checkLocalStorageSupport();
    
    console.log(`Storage availability: IndexedDB=${hasIndexedDB}, localStorage=${hasLocalStorage}, Memory=true`);
    
    // Initialize IndexedDB if available
    if (hasIndexedDB) {
      try {
        await initIndexedDB();
      } catch (e) {
        console.warn('IndexedDB initialization failed:', e);
        hasIndexedDB = false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize fallback database system:', error);
    return false;
  }
}

/**
 * Initialize the IndexedDB database with required object stores
 */
async function initIndexedDB() {
  if (!window.indexedDB) return false;
  
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB open failed:', event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores for each data type if they don't exist
      if (!db.objectStoreNames.contains(STORES.CODE_SNIPPETS)) {
        const codeStore = db.createObjectStore(STORES.CODE_SNIPPETS, { keyPath: 'id' });
        codeStore.createIndex('language', 'language', { unique: false });
        codeStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        const filesStore = db.createObjectStore(STORES.FILES, { keyPath: 'path' });
        filesStore.createIndex('projectId', 'projectId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        const projectsStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        projectsStore.createIndex('name', 'name', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      
      if (!db.objectStoreNames.contains(STORES.EXECUTION_HISTORY)) {
        const historyStore = db.createObjectStore(STORES.EXECUTION_HISTORY, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        historyStore.createIndex('language', 'language', { unique: false });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create API queue store if it doesn't exist
      if (!db.objectStoreNames.contains(STORES.API_QUEUE)) {
        const apiQueueStore = db.createObjectStore(STORES.API_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        apiQueueStore.createIndex('method', 'method', { unique: false });
        apiQueueStore.createIndex('url', 'url', { unique: false });
        apiQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log('IndexedDB initialized successfully');
      db.close();
      resolve(true);
    };
  });
}

/**
 * Save data to the fallback database
 * @param {string} storeName - The name of the store/collection to save to
 * @param {Object} data - The data to save
 * @returns {Promise<Object>} - The saved data
 */
export async function saveToFallbackDB(storeName, data) {
  // Add timestamp if not present
  const itemToSave = {
    ...data,
    _lastUpdated: data._lastUpdated || Date.now()
  };
  
  // Try IndexedDB first
  if (hasIndexedDB) {
    try {
      return await saveToIndexedDB(storeName, itemToSave);
    } catch (error) {
      console.warn(`IndexedDB save failed for ${storeName}, trying localStorage:`, error);
    }
  }
  
  // Try localStorage as fallback
  if (hasLocalStorage) {
    try {
      return await saveToLocalStorage(storeName, itemToSave);
    } catch (error) {
      console.warn(`localStorage save failed for ${storeName}, using memory fallback:`, error);
    }
  }
  
  // Use memory storage as last resort
  return saveToMemory(storeName, itemToSave);
}

/**
 * Save data to IndexedDB
 */
async function saveToIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const saveRequest = store.put(data);
      
      saveRequest.onerror = (event) => {
        db.close();
        reject(event.target.error);
      };
      
      saveRequest.onsuccess = (event) => {
        db.close();
        resolve(data);
      };
    };
  });
}

/**
 * Save data to localStorage
 */
function saveToLocalStorage(storeName, data) {
  try {
    // For localStorage, we need a key to identify the record
    const keyField = storeName === STORES.FILES ? 'path' : 
                     storeName === STORES.SETTINGS ? 'key' : 'id';
    
    const key = data[keyField];
    if (!key) {
      throw new Error(`No key field (${keyField}) found in data for localStorage`);
    }
    
    // Store by combining storeName and key
    const storageKey = `${storeName}:${key}`;
    
    // Store the data as a JSON string
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    // Also keep track of all keys for this store to enable querying
    const storeKeys = JSON.parse(localStorage.getItem(`${storeName}:_keys`) || '[]');
    if (!storeKeys.includes(key)) {
      storeKeys.push(key);
      localStorage.setItem(`${storeName}:_keys`, JSON.stringify(storeKeys));
    }
    
    return data;
  } catch (error) {
    if (error.name === 'QuotaExceededError' || 
        error.message.includes('exceeded') || 
        error.message.includes('quota')) {
      // Clear old data to make room
      pruneLocalStorage();
      
      // Try one more time
      const keyField = storeName === STORES.FILES ? 'path' : 
                       storeName === STORES.SETTINGS ? 'key' : 'id';
      const key = data[keyField];
      const storageKey = `${storeName}:${key}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return data;
    }
    throw error;
  }
}

/**
 * Remove old entries when localStorage is full
 */
function pruneLocalStorage() {
  try {
    // Find oldest items to remove
    const allKeys = Object.keys(localStorage);
    const items = allKeys
      .filter(key => key.includes(':') && !key.endsWith(':_keys'))
      .map(key => {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          return { 
            key, 
            lastUpdated: value._lastUpdated || 0
          };
        } catch (e) {
          return { key, lastUpdated: 0 };
        }
      })
      .sort((a, b) => a.lastUpdated - b.lastUpdated);
    
    // Remove up to 20% of oldest items
    const itemsToRemove = Math.max(Math.floor(items.length * 0.2), 5);
    items.slice(0, itemsToRemove).forEach(item => {
      localStorage.removeItem(item.key);
      console.log(`Removed old localStorage item: ${item.key}`);
    });
  } catch (e) {
    console.error('Error pruning localStorage:', e);
  }
}

/**
 * Save data to memory
 */
function saveToMemory(storeName, data) {
  // Initialize store if it doesn't exist
  if (!memoryStorage[storeName]) {
    memoryStorage[storeName] = {};
  }
  
  // For memory storage, we need a key to identify the record
  const keyField = storeName === STORES.FILES ? 'path' : 
                   storeName === STORES.SETTINGS ? 'key' : 'id';
                   
  const key = data[keyField];
  if (!key) {
    throw new Error(`No key field (${keyField}) found in data for memory storage`);
  }
  
  // Store the data
  memoryStorage[storeName][key] = data;
  return data;
}

/**
 * Retrieve data from the fallback database
 * @param {string} storeName - Name of the store
 * @param {string|number} key - Key to retrieve
 * @returns {Promise<object|null>} - Retrieved data or null
 */
export async function getFromFallbackDB(storeName, key) {
  // Try IndexedDB first
  if (hasIndexedDB) {
    try {
      const result = await getFromIndexedDB(storeName, key);
      if (result) return result;
    } catch (error) {
      console.warn(`IndexedDB retrieval failed for ${storeName}:${key}, trying localStorage:`, error);
    }
  }
  
  // Try localStorage as fallback
  if (hasLocalStorage) {
    try {
      const storageKey = `${storeName}:${key}`;
      const item = localStorage.getItem(storageKey);
      if (item) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`localStorage retrieval failed for ${storeName}:${key}, using memory fallback:`, error);
    }
  }
  
  // Use memory storage as last resort
  if (memoryStorage[storeName] && memoryStorage[storeName][key]) {
    return memoryStorage[storeName][key];
  }
  
  return null;
}

/**
 * Get data from IndexedDB
 */
async function getFromIndexedDB(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);
        
        getRequest.onerror = (event) => {
          db.close();
          reject(event.target.error);
        };
        
        getRequest.onsuccess = (event) => {
          db.close();
          resolve(getRequest.result || null);
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

/**
 * Query data from the fallback database
 * @param {string} storeName - Name of the store
 * @param {function} filterFn - Filter function
 * @returns {Promise<Array>} - Filtered results
 */
export async function queryFallbackDB(storeName, filterFn) {
  const results = [];
  
  // Try IndexedDB first
  if (hasIndexedDB) {
    try {
      const idbResults = await queryIndexedDB(storeName, filterFn);
      results.push(...idbResults);
    } catch (error) {
      console.warn(`IndexedDB query failed for ${storeName}, trying localStorage:`, error);
    }
  }
  
  // Try localStorage as fallback or supplement
  if (hasLocalStorage) {
    try {
      const storeKeys = JSON.parse(localStorage.getItem(`${storeName}:_keys`) || '[]');
      
      for (const key of storeKeys) {
        try {
          const storageKey = `${storeName}:${key}`;
          const item = JSON.parse(localStorage.getItem(storageKey) || 'null');
          
          // Skip items already found in IndexedDB
          if (item && !results.some(r => 
            (r.id && r.id === item.id) || 
            (r.path && r.path === item.path) || 
            (r.key && r.key === item.key)
          )) {
            if (!filterFn || filterFn(item)) {
              results.push(item);
            }
          }
        } catch (e) {
          console.warn(`Error parsing localStorage item ${storeName}:${key}:`, e);
        }
      }
    } catch (error) {
      console.warn(`localStorage query failed for ${storeName}, using memory fallback:`, error);
    }
  }
  
  // Use memory storage as last resort or supplement
  if (memoryStorage[storeName]) {
    const memoryItems = Object.values(memoryStorage[storeName]);
    
    for (const item of memoryItems) {
      // Skip items already found in IndexedDB or localStorage
      if (!results.some(r => 
        (r.id && r.id === item.id) || 
        (r.path && r.path === item.path) || 
        (r.key && r.key === item.key)
      )) {
        if (!filterFn || filterFn(item)) {
          results.push(item);
        }
      }
    }
  }
  
  return results;
}

/**
 * Query data from IndexedDB
 */
async function queryIndexedDB(storeName, filterFn) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject(event.target.error);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const results = [];
      
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const cursorRequest = store.openCursor();
        
        cursorRequest.onerror = (event) => {
          db.close();
          reject(event.target.error);
        };
        
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const item = cursor.value;
            if (!filterFn || filterFn(item)) {
              results.push(item);
            }
            cursor.continue();
          } else {
            db.close();
            resolve(results);
          }
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  });
}

/**
 * Sync local fallback data with backend when connection is restored
 * @param {string} storeName - Name of the store
 * @param {function} syncFn - Function to sync a single item with backend
 * @returns {Promise<object>} - Sync results
 */
export async function syncFallbackData(storeName, syncFn) {
  if (!syncFn || typeof syncFn !== 'function') {
    throw new Error('syncFn must be a function');
  }
  
  const results = {
    success: [],
    failed: [],
    skipped: [],
    total: 0
  };
  
  // Get all items that need syncing
  const pendingItems = await queryFallbackDB(storeName, item => {
    return item._pendingSync === true;
  });
  
  results.total = pendingItems.length;
  if (pendingItems.length === 0) {
    return results;
  }
  
  console.log(`Syncing ${pendingItems.length} items from ${storeName}...`);
  
  // Process each pending item
  for (const item of pendingItems) {
    try {
      // Don't retry items that have failed too many times
      const syncAttempts = item._syncAttempts || 0;
      if (syncAttempts > 5) {
        console.warn(`Skipping sync for item that failed too many times:`, item);
        results.skipped.push(item);
        continue;
      }
      
      // Call the provided sync function
      const syncResult = await syncFn(item);
      
      if (syncResult && syncResult.success) {
        // Update local copy to mark as synced
        await saveToFallbackDB(storeName, {
          ...item,
          ...syncResult.data,  // Apply any changes from server
          _pendingSync: false,
          _syncError: null,
          _lastRemoteUpdate: new Date().getTime(),
          _syncAttempts: 0
        });
        
        results.success.push(item);
      } else {
        // Mark as still pending but increment attempt counter
        await saveToFallbackDB(storeName, {
          ...item,
          _syncAttempts: syncAttempts + 1,
          _syncError: syncResult?.error || 'Unknown sync error'
        });
        
        results.failed.push({
          item,
          error: syncResult?.error || 'Unknown sync error'
        });
      }
    } catch (error) {
      console.error(`Error syncing item from ${storeName}:`, error, item);
      
      // Update error state but keep pending
      try {
        const syncAttempts = item._syncAttempts || 0;
        await saveToFallbackDB(storeName, {
          ...item,
          _syncAttempts: syncAttempts + 1,
          _syncError: error.message || String(error)
        });
      } catch (saveError) {
        console.error('Failed to update sync error state:', saveError);
      }
      
      results.failed.push({
        item,
        error: error.message || String(error)
      });
    }
  }
  
  return results;
}

/**
 * Clean up expired data from fallback storage
 */
export async function cleanupFallbackStorage() {
  const now = Date.now();
  
  // Clear expired items from each store
  for (const storeName of Object.values(STORES)) {
    try {
      // Get all items
      const items = await queryFallbackDB(storeName, item => {
        // Keep all pending sync items regardless of age
        if (item._pendingSync) return false;
        
        // Check TTL based on item type
        const ttl = storeName === STORES.EXECUTION_HISTORY ? CACHE_TTL.MEDIUM : CACHE_TTL.LONG;
        return item._lastUpdated && (now - item._lastUpdated > ttl);
      });
      
      console.log(`Found ${items.length} expired items in ${storeName}`);
      
      // Delete expired items
      for (const item of items) {
        try {
          // Use the appropriate key for this store
          const keyField = storeName === STORES.FILES ? 'path' : 
                          storeName === STORES.SETTINGS ? 'key' : 'id';
          const key = item[keyField];
          
          // Delete from IndexedDB if available
          if (hasIndexedDB) {
            const db = await new Promise((resolve, reject) => {
              const request = indexedDB.open('coder_fallback_db', 1);
              request.onerror = (event) => reject(event.target.error);
              request.onsuccess = (event) => resolve(event.target.result);
            });
            
            const tx = db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            await store.delete(key);
            await tx.complete;
            db.close();
          }
          
          // Delete from localStorage if needed
          if (hasLocalStorage) {
            localStorage.removeItem(`${storeName}:${key}`);
          }
          
          // Delete from memory
          if (memoryStorage[storeName] && memoryStorage[storeName][key]) {
            delete memoryStorage[storeName][key];
          }
          
        } catch (deleteError) {
          console.warn(`Failed to delete expired item from ${storeName}:`, deleteError);
        }
      }
    } catch (storeError) {
      console.error(`Error cleaning up ${storeName}:`, storeError);
    }
  }
}

// Export the main functions
export default {
  initFallbackDatabase,
  saveToFallbackDB,
  getFromFallbackDB,
  queryFallbackDB,
  syncFallbackData,
  cleanupFallbackStorage,
  STORES,
  CACHE_TTL
};
