// chatUtils.js - Chat API utility functions with robust fallbacks
import { checkApiHealth } from '../components/ProjectDashboard/projectUtils.jsx';

import { selectAIModel, routeMessageToAI } from './aiModelManager';
import { defaultModels, defaultConsensusConfig } from './modelConfig';

/**
 * Enhanced API health check with multiple fallbacks for API connectivity
 * 
 * @param {string} apiEndpoint - The API endpoint to check
 * @returns {Promise<Object>} Health status object { status, message }
 */
export const checkChatApiHealth = async (apiEndpoint) => {
  try {
    // First check browser's online status
    const hasNavigatorConnection = typeof navigator !== 'undefined' && navigator.onLine;
    
    if (!hasNavigatorConnection) {
      return {
        status: 'offline',
        message: 'No internet connection detected'
      };
    }
    
    // Try connecting to reliable public endpoints to verify internet connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // Multiple reliable endpoints for fallback
      const endpoints = [
        'https://www.google.com/favicon.ico',
        'https://www.cloudflare.com/favicon.ico',
        'https://www.microsoft.com/favicon.ico',
        'https://www.apple.com/favicon.ico'
      ];
      
      let internetAvailable = false;
      for (const endpoint of endpoints) {
        try {
          await fetch(`${endpoint}?_=${Date.now()}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
          });
          
          internetAvailable = true;
          break;
        } catch (e) {
          console.log(`Endpoint ${endpoint} unreachable, trying next...`);
        }
      }
      
      clearTimeout(timeoutId);
      
      if (!internetAvailable) {
        return {
          status: 'offline',
          message: 'Internet connection test failed'
        };
      }
    } catch (netError) {
      console.warn('Internet connectivity test failed:', netError);
    }
    
    // If we reach here, we have internet - now check API
    // Use ProjectDashboard's health check utility
    const apiHealth = await checkApiHealth(apiEndpoint, true);
    return apiHealth;
    
  } catch (error) {
    console.error('Error checking chat API status:', error);
    return {
      status: 'error',
      message: 'Error checking connection'
    };
  }
};

/**
 * Get a suitable model for chat generation based on availability
 * Implements multiple fallbacks for AI model selection
 * 
 * @param {boolean} useFallbackModels - Whether to allow fallback models
 * @returns {string} Model identifier to use
 */
export const getAIModel = (useFallbackModels = true) => {
  // Define model hierarchy from most to least preferred
  const modelHierarchy = [
    { id: 'primary', name: 'gpt-4-turbo' },
    { id: 'fallback1', name: 'gpt-3.5-turbo' },
    { id: 'fallback2', name: 'claude-3-haiku' },
    { id: 'fallback3', name: 'llama-2-70b' },
    { id: 'fallback4', name: 'local-model' }
  ];
  
  // If fallbacks not allowed, only return primary
  if (!useFallbackModels) {
    return modelHierarchy[0].name;
  }
  
  // In a real implementation, we would check model availability here
  // For now, we simulate always returning the primary model
  return modelHierarchy[0].name;
};

/**
 * Sanitize a value for storage by removing non-serializable data
 * @param {any} value - The value to sanitize
 * @returns {any} Sanitized value
 */
function sanitizeForStorage(value) {
  try {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }
    
    // Handle primitive types (string, number, boolean, bigint, symbol)
    const type = typeof value;
    if (type !== 'object' && type !== 'function') {
      return value;
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle Arrays
    if (Array.isArray(value)) {
      return value.map(item => sanitizeForStorage(item));
    }
    
    // Handle built-in objects that might cause issues
    if (value instanceof Map || value instanceof Set || value instanceof WeakMap || value instanceof WeakSet) {
      return Array.from(value).map(item => sanitizeForStorage(item));
    }
    
    // Handle React elements and other non-serializable objects
    if (value.$$typeof || 
        value instanceof HTMLElement || 
        value instanceof Event || 
        value instanceof Node || 
        type === 'function' ||
        (value.constructor && value.constructor.name !== 'Object')) {
      return `[${value.constructor?.name || 'Non-serializable object'}]`;
    }
    
    // Handle plain objects
    const sanitized = {};
    for (const key in value) {
      try {
        // Skip functions and symbols
        if (typeof value[key] !== 'function' && typeof value[key] !== 'symbol') {
          sanitized[key] = sanitizeForStorage(value[key]);
        }
      } catch (e) {
        console.warn(`Error sanitizing property ${key}:`, e);
        sanitized[key] = '[Error sanitizing value]';
      }
    }
    return sanitized;
  } catch (error) {
    console.error('Error in sanitizeForStorage:', error);
    return '[Error sanitizing data]';
  }
}

/**
 * Save chat history to multiple storage options with fallbacks
 * 
 * @param {Array} chatHistory - Array of chat messages to save
 * @returns {boolean} True if saved successfully, false otherwise
 */
export function saveChatHistory(history) {
  if (!history) {
    console.warn('No history provided to saveChatHistory');
    return false;
  }

  // Sanitize history before saving
  let sanitizedHistory;
  try {
    console.log('Sanitizing chat history...');
    sanitizedHistory = Array.isArray(history) 
      ? history.map((msg, index) => {
          try {
            return sanitizeForStorage(msg);
          } catch (e) {
            console.error(`Error sanitizing message at index ${index}:`, e);
            return { error: `[Error sanitizing message: ${e.message}]` };
          }
        })
      : [];
    console.log('Sanitized chat history:', sanitizedHistory);
  } catch (e) {
    console.error('Critical error sanitizing chat history:', e);
    return false;
  }

  // First try IndexedDB
  try {
    console.log('Attempting to save to IndexedDB...');
    const request = window.indexedDB.open('chatHistoryDB', 1);
    
    request.onupgradeneeded = (event) => {
      try {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('chatHistory')) {
          db.createObjectStore('chatHistory', { keyPath: 'id' });
        }
      } catch (e) {
        console.error('Error in IndexedDB upgrade:', e);
      }
    };
    
    request.onsuccess = (event) => {
      try {
        const db = event.target.result;
        const transaction = db.transaction(['chatHistory'], 'readwrite');
        const store = transaction.objectStore('chatHistory');
        
        // Use sanitized history for storage
        store.put({ id: 'latest', history: sanitizedHistory });
        
        transaction.oncomplete = () => {
          console.log('Successfully saved chat history to IndexedDB');
        };
        
        transaction.onerror = (e) => {
          console.error('Transaction error in IndexedDB:', e);
          fallbackToLocalStorage(sanitizedHistory);
        };
      } catch (e) {
        console.error('Error in IndexedDB transaction:', e);
        fallbackToLocalStorage(sanitizedHistory);
      }
    };
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      fallbackToLocalStorage(sanitizedHistory);
    };
    
    return true;
  } catch (e) {
    console.error('Critical error with IndexedDB:', e);
    return fallbackToLocalStorage(sanitizedHistory);
  }
  
  function fallbackToLocalStorage(data) {
    try {
      console.log('Falling back to localStorage...');
      localStorage.setItem('chatHistory', JSON.stringify(data));
      console.log('Successfully saved chat history to localStorage');
      return true;
    } catch (e) {
      console.error('Error saving to localStorage, falling back to sessionStorage:', e);
      try {
        sessionStorage.setItem('chatHistory', JSON.stringify(data));
        console.log('Successfully saved chat history to sessionStorage');
        return true;
      } catch (e) {
        console.error('Could not save chat history anywhere');
        return false;
      }
    }
  }
  
  // If we get here, IndexedDB is not supported
  console.error('IndexedDB not supported, falling back to localStorage');
  return fallbackToLocalStorage(sanitizedHistory);
}

/**
 * Save user settings with fallbacks
 * @param {Object} settings - User settings to save
 */
export function saveUserSettings(settings) {
  // First try IndexedDB
  try {
    const request = window.indexedDB.open('chatSettingsDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      
      store.put({ id: 'user', settings });
      
      transaction.oncomplete = () => {
        console.log('Settings saved to IndexedDB');
      };
    };
    
    request.onerror = () => {
      console.error('Error saving settings to IndexedDB, falling back to localStorage');
      // Fall back to localStorage
      try {
        // To prevent API keys from being stored in plain localStorage,
        // we create a sanitized version without sensitive data for less secure storage
        const sanitizedSettings = { ...settings };
        
        // Remove API keys from the sanitized settings
        if (sanitizedSettings.apiKeys) {
          // Keep only the fact that keys exist, not the keys themselves
          const providers = Object.keys(sanitizedSettings.apiKeys);
          sanitizedSettings.configuredApiProviders = providers;
          delete sanitizedSettings.apiKeys;
        }
        
        localStorage.setItem('chatSettings', JSON.stringify(sanitizedSettings));
        console.log('Sanitized settings saved to localStorage');
      } catch (e) {
        console.error('Error saving to localStorage, falling back to sessionStorage');
        try {
          sessionStorage.setItem('chatSettings', JSON.stringify(settings));
          console.log('Settings saved to sessionStorage');
        } catch (e) {
          console.error('Could not save settings anywhere');
        }
      }
    };
  } catch (e) {
    console.error('IndexedDB not supported, falling back to localStorage');
    // Fall back like above
    try {
      const sanitizedSettings = { ...settings };
      if (sanitizedSettings.apiKeys) {
        const providers = Object.keys(sanitizedSettings.apiKeys);
        sanitizedSettings.configuredApiProviders = providers;
        delete sanitizedSettings.apiKeys;
      }
      localStorage.setItem('chatSettings', JSON.stringify(sanitizedSettings));
    } catch (e) {
      console.error('Error saving to localStorage, falling back to sessionStorage');
      try {
        sessionStorage.setItem('chatSettings', JSON.stringify(settings));
      } catch (e) {
        console.error('Could not save settings anywhere');
      }
    }
  }
}

/**
 * Load user settings with fallbacks
 * @returns {Promise<Object>} User settings or default settings if none found
 */
export async function loadUserSettings() {
  // Try to load from IndexedDB
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open('chatSettingsDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const getRequest = store.get('user');
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            console.log('Settings loaded from IndexedDB');
            resolve(getRequest.result.settings);
          } else {
            // Try localStorage
            tryLocalStorage();
          }
        };
        
        getRequest.onerror = () => {
          console.error('Error loading settings from IndexedDB');
          tryLocalStorage();
        };
      };
      
      request.onerror = () => {
        console.error('Error opening settings DB');
        tryLocalStorage();
      };
      
    } catch (e) {
      console.error('IndexedDB not supported');
      tryLocalStorage();
    }
    
    function tryLocalStorage() {
      try {
        const settings = localStorage.getItem('chatSettings');
        if (settings) {
          console.log('Settings loaded from localStorage');
          const parsedSettings = JSON.parse(settings);
          
          // If we have sanitized settings (only provider names, not keys)
          if (parsedSettings.configuredApiProviders) {
            // Create empty apiKeys object with providers
            parsedSettings.apiKeys = {};
            parsedSettings.configuredApiProviders.forEach(provider => {
              parsedSettings.apiKeys[provider] = ''; // Empty key, will need to be re-entered
            });
            delete parsedSettings.configuredApiProviders;
          }
          
          resolve(parsedSettings);
        } else {
          trySessionStorage();
        }
      } catch (e) {
        console.error('Error loading from localStorage');
        trySessionStorage();
      }
    }
    
    function trySessionStorage() {
      try {
        const settings = sessionStorage.getItem('chatSettings');
        if (settings) {
          console.log('Settings loaded from sessionStorage');
          resolve(JSON.parse(settings));
        } else {
          // No settings found anywhere, return defaults
          resolve(getDefaultChatSettings());
        }
      } catch (e) {
        console.error('Error loading from sessionStorage');
        resolve(getDefaultChatSettings());
      }
    }
  });
}

/**
 * Load chat history with multiple storage fallbacks
 * 
 * @returns {Array|null} Chat history array or null if not found
 */
export async function loadChatHistory() {
  try {
    // Try IndexedDB first
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('ChatDatabase', 1);
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          if (db.objectStoreNames.contains('chatHistory')) {
            const transaction = db.transaction(['chatHistory'], 'readonly');
            const store = transaction.objectStore('chatHistory');
            const getRequest = store.get('mainChatHistory');
            
            getRequest.onsuccess = () => {
              if (getRequest.result) {
                resolve(getRequest.result.data);
              } else {
                resolve(null);
              }
            };
            
            getRequest.onerror = () => {
              reject(new Error('Error reading from IndexedDB'));
            };
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(new Error('Could not open IndexedDB'));
      });
    } catch (idbError) {
      console.warn('IndexedDB load failed, trying localStorage:', idbError);
      
      // Try localStorage next
      const lsData = localStorage.getItem('chatHistory');
      if (lsData) {
        return JSON.parse(lsData);
      }
      
      // Try sessionStorage as last resort
      const ssData = sessionStorage.getItem('chatHistory');
      if (ssData) {
        return JSON.parse(ssData);
      }
      
      return null;
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    return null;
  }
};
