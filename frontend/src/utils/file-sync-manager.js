/**
 * File Sync Manager
 * Handles synchronization between local and backend storage with robust fallbacks
 * Uses multi-layered fallback approach for maximum reliability
 * Supports multiple programming languages with proper detection and fallbacks
 */

// Check if running in Node.js environment
const isNode = typeof process !== 'undefined' && 
               process.versions != null && 
               process.versions.node != null;

import logger from './logger';
const log = logger.ns('api:sync:file');

// Import database utilities directly to avoid circular dependencies
import dbFallback from './database-fallback.js';
const { saveToFallbackDB, getFromFallbackDB, queryFallbackDB, STORES } = dbFallback;

// Import language utilities for multi-language support
import { detectLanguageFromPath, detectLanguageFromContent, canExecuteOnBackend } from './language-utils.js';

// For API client, we'll use dynamic imports to avoid circular dependencies
let apiClient = null;
const getApiClient = async () => {
  if (!apiClient) {
    try {
      const api = await import('../api').then(module => module.default);
      apiClient = api;
    } catch (e) {
      log.error('Failed to load API client:', e);
      // Return a minimal fallback API client with basic functionality
      return {
        getBaseUrl: () => '/api',
        get: (url, config) => fetch(url, { ...config, method: 'GET' }).then(r => r.json()),
        post: (url, data, config) => fetch(url, { 
          ...config, 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(r => r.json())
      };
    }
  }
  return apiClient;
};

// File sync states
const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  CONFLICT: 'conflict',
  ERROR: 'error',
  LOCAL_ONLY: 'local_only',
  REMOTE_ONLY: 'remote_only'
};

// Sync conflict resolution strategies
const CONFLICT_RESOLUTION = {
  LOCAL_WINS: 'local_wins',
  REMOTE_WINS: 'remote_wins',
  MERGE: 'merge',
  MANUAL: 'manual'
};

// Default settings
const DEFAULT_SETTINGS = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  conflictStrategy: CONFLICT_RESOLUTION.MANUAL,
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
  enableCompression: true,
  diffSync: true, // Only sync changes, not full files
};

class FileSyncManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.syncQueue = [];
    this.isOnline = isNode ? true : (typeof navigator !== 'undefined' ? navigator.onLine : true);
    this.isSyncing = false;
    this.syncTimer = null;
    this.pendingSyncPromises = new Map();
    this.lastSyncTime = 0;
    this.initialized = false;
    
    // Bind event handlers
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.processQueue = this.processQueue.bind(this);
  }
  
  /**
   * Initialize the sync manager
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // Load settings from local storage
      const storedSettings = await getFromFallbackDB(STORES.SETTINGS, 'syncSettings');
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...storedSettings };
      }
      
      // Set up online/offline event listeners
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Start sync timer if auto-sync is enabled
      if (this.settings.autoSync && this.isOnline) {
        this.startSyncTimer();
      }
      
      // Load pending sync queue
      const pendingItems = await queryFallbackDB(STORES.FILES, (item) => 
        item._pendingSync || item._created_offline
      );
      
      if (pendingItems && pendingItems.length > 0) {
        this.syncQueue.push(...pendingItems);
        log.info(`Loaded ${pendingItems.length} pending items for sync`);
      }
      
      this.initialized = true;
      log.info('File Sync Manager initialized');
      
      // Initial sync if we're online
      if (this.isOnline && pendingItems.length > 0) {
        setTimeout(() => this.sync(), 1000);
      }
      
      return true;
    } catch (error) {
      log.error('Failed to initialize File Sync Manager:', error);
      return false;
    }
  }
  
  /**
   * Handle coming back online
   */
  handleOnline() {
    log.info('Back online, resuming sync');
    this.isOnline = true;
    
    if (this.settings.autoSync) {
      this.startSyncTimer();
      // Trigger immediate sync after coming back online
      this.sync();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('filesync:online'));
  }
  
  /**
   * Handle going offline
   */
  handleOffline() {
    log.warn('Offline, pausing sync');
    this.isOnline = false;
    this.stopSyncTimer();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('filesync:offline'));
  }
  
  /**
   * Start the automatic sync timer
   */
  startSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(this.processQueue, this.settings.syncInterval);
  }
  
  /**
   * Stop the automatic sync timer
   */
  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  /**
   * Update sync settings
   * @param {object} newSettings - New settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Apply changes
    if (newSettings.autoSync !== undefined) {
      if (newSettings.autoSync && this.isOnline && !this.syncTimer) {
        this.startSyncTimer();
      } else if (!newSettings.autoSync && this.syncTimer) {
        this.stopSyncTimer();
      }
    }
    
    if (newSettings.syncInterval !== undefined && this.syncTimer) {
      this.stopSyncTimer();
      if (this.settings.autoSync && this.isOnline) {
        this.startSyncTimer();
      }
    }
    
    // Save settings to local storage
    await saveToFallbackDB(STORES.SETTINGS, {
      key: 'syncSettings',
      ...this.settings
    });
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('filesync:settingsChanged', {
      detail: { settings: this.settings }
    }));
  }
  
  /**
   * Save a file with offline sync capability
   * @param {object} file - File object
   * @param {boolean} forceSyncNow - Force immediate sync attempt
   * @returns {Promise<object>} - Result with sync status
   */
  async saveFile(file, forceSyncNow = false) {
    if (!file || !file.path) {
      throw new Error('Invalid file object');
    }
    
    // Ensure file has language information
    if (!file.language) {
      // First try to detect from path
      file.language = detectLanguageFromPath(file.path);
      
      // If still unknown, try content-based detection
      if (file.language === 'text' && file.content) {
        file.language = detectLanguageFromContent(file.content, 'text');
      }
    }
    
    // Add sync metadata
    const timestamp = new Date().getTime();
    const fileWithMeta = {
      ...file,
      language: file.language, // Ensure language is preserved
      _lastUpdated: timestamp,
      _pendingSync: this.isOnline ? false : true,
      _created_offline: file._created_offline || !this.isOnline,
      _syncAttempts: 0,
      _syncError: null
    };
    
    // Save to local storage
    await saveToFallbackDB(STORES.FILES, fileWithMeta);
    
    // Add to sync queue if needed
    if (fileWithMeta._pendingSync || forceSyncNow) {
      this.addToSyncQueue(fileWithMeta);
      
      if (forceSyncNow && this.isOnline) {
        // Return promise that resolves when sync is complete
        return this.syncFile(fileWithMeta);
      }
    } else if (this.isOnline && forceSyncNow) {
      // Directly sync to backend
      try {
        const api = await getApiClient();
        await api.saveFile(file);
      } catch (error) {
        // On error, mark as pending and add to queue
        fileWithMeta._pendingSync = true;
        fileWithMeta._syncError = error.message;
        await saveToFallbackDB(STORES.FILES, fileWithMeta);
        this.addToSyncQueue(fileWithMeta);
      }
    }
    
    return {
      success: true,
      file: fileWithMeta,
      syncStatus: fileWithMeta._pendingSync ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED
    };
  }
  
  /**
   * Load a file with fallback to local cache
   * @param {string} path - File path
   * @returns {Promise<object>} - File object
   */
  async loadFile(path) {
    if (!path) {
      throw new Error('File path is required');
    }
    
    // Try backend first if online
    if (this.isOnline) {
      try {
        const api = await getApiClient();
        const remoteFile = await api.loadFile(path);
        
        // Cache the file locally
        await saveToFallbackDB(STORES.FILES, {
          ...remoteFile,
          _lastUpdated: new Date().getTime(),
          _pendingSync: false,
          _syncError: null
        });
        
        return remoteFile;
      } catch (error) {
        log.warn(`Failed to load file from backend, trying local cache: ${path}`, error);
        // Fall back to local cache
      }
    }
    
    // Get from local storage
    const localFile = await getFromFallbackDB(STORES.FILES, path);
    
    if (!localFile) {
      throw new Error(`File not found: ${path}`);
    }
    
    return {
      ...localFile,
      fromCache: true
    };
  }
  
  /**
   * Add a file to the sync queue
   * @param {object} file - File object
   */
  addToSyncQueue(file) {
    // Remove any existing entry for this file
    this.syncQueue = this.syncQueue.filter(item => item.path !== file.path);
    
    // Add to queue
    this.syncQueue.push(file);
    
    // Notify listeners
    window.dispatchEvent(new CustomEvent('filesync:queueUpdated', {
      detail: { queueLength: this.syncQueue.length }
    }));
    
    // Process queue if online and not already syncing
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }
  
  /**
   * Process the sync queue
   */
  async processQueue() {
    if (!this.isOnline || this.isSyncing || this.syncQueue.length === 0) {
      return;
    }
    
    this.isSyncing = true;
    
    try {
      log.info(`Processing sync queue: ${this.syncQueue.length} items`);
      
      // Take a snapshot of the current queue
      const currentQueue = [...this.syncQueue];
      
      // Clear the queue
      this.syncQueue = [];
      
      // Process each item
      const results = await Promise.allSettled(
        currentQueue.map(file => this.syncFile(file))
      );
      
      // Handle results
      const failed = results
        .filter((result, i) => result.status === 'rejected')
        .map((result, i) => currentQueue[i]);
      
      // Add failed items back to queue
      if (failed.length > 0) {
        log.warn(`${failed.length} items failed to sync, adding back to queue`);
        this.syncQueue.push(...failed);
      }
      
      this.lastSyncTime = new Date().getTime();
      
      // Notify listeners
      window.dispatchEvent(new CustomEvent('filesync:syncComplete', {
        detail: {
          success: results.filter(r => r.status === 'fulfilled').length,
          failed: failed.length,
          timestamp: this.lastSyncTime
        }
      }));
    } catch (error) {
      log.error('Error processing sync queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Sync a single file to the backend
   * @param {object} file - File to sync
   * @returns {Promise<object>} - Sync result
   */
  async syncFile(file) {
    // Skip sync if we're offline
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    // Check if there's already a pending sync for this file
    if (this.pendingSyncPromises.has(file.path)) {
      return this.pendingSyncPromises.get(file.path);
    }
    
    const syncPromise = (async () => {
      try {
        // Increment sync attempt counter
        file._syncAttempts = (file._syncAttempts || 0) + 1;
        file._syncError = null;
        
        // Save updated sync metadata
        await saveToFallbackDB(STORES.FILES, file);
        
        // Check for conflicts if this is a modification
        let hasConflict = false;
        let remoteFile = null;
        
        if (!file._created_offline) {
          try {
            const api = await getApiClient();
            remoteFile = await api.loadFile(file.path);
            
            // Check if remote has been modified since our last sync
            if (remoteFile && remoteFile.updatedAt && file._lastRemoteUpdate &&
                new Date(remoteFile.updatedAt) > new Date(file._lastRemoteUpdate)) {
              hasConflict = true;
            }
          } catch (loadError) {
            // If file doesn't exist remotely, no conflict
            if (loadError.response && loadError.response.status === 404) {
              hasConflict = false;
            }
          }
        }
        
        // Handle conflicts
        if (hasConflict) {
          switch (this.settings.conflictStrategy) {
            case CONFLICT_RESOLUTION.LOCAL_WINS:
              // Continue with upload, local changes will overwrite remote
              break;
              
            case CONFLICT_RESOLUTION.REMOTE_WINS:
              // Skip upload, keep remote version
              await saveToFallbackDB(STORES.FILES, {
                ...remoteFile,
                _lastUpdated: new Date().getTime(),
                _pendingSync: false,
                _syncError: null,
                _lastRemoteUpdate: new Date(remoteFile.updatedAt).getTime()
              });
              return {
                success: true,
                file: remoteFile,
                syncStatus: SYNC_STATUS.SYNCED,
                message: 'Remote version kept'
              };
              
            case CONFLICT_RESOLUTION.MERGE:
              // TODO: Implement diff-based merging
              // For now, mark as conflict
              file._conflict = true;
              file._remoteVersion = remoteFile;
              await saveToFallbackDB(STORES.FILES, file);
              
              window.dispatchEvent(new CustomEvent('filesync:conflict', {
                detail: { file, remoteFile }
              }));
              
              return {
                success: false,
                file,
                syncStatus: SYNC_STATUS.CONFLICT,
                message: 'Sync conflict detected'
              };
              
            case CONFLICT_RESOLUTION.MANUAL:
            default:
              // Mark as conflict and notify user
              file._conflict = true;
              file._remoteVersion = remoteFile;
              await saveToFallbackDB(STORES.FILES, file);
              
              window.dispatchEvent(new CustomEvent('filesync:conflict', {
                detail: { file, remoteFile }
              }));
              
              return {
                success: false,
                file,
                syncStatus: SYNC_STATUS.CONFLICT,
                message: 'Sync conflict detected'
              };
          }
        }
        
        // Save to backend
        const api = await getApiClient();
        const syncedFile = await api.saveFile({
          path: file.path,
          content: file.content,
          language: file.language,
          projectId: file.projectId
        });
        
        // Update local copy with sync info
        await saveToFallbackDB(STORES.FILES, {
          ...syncedFile,
          _lastUpdated: new Date().getTime(),
          _pendingSync: false,
          _created_offline: false,
          _syncError: null,
          _lastRemoteUpdate: new Date(syncedFile.updatedAt).getTime()
        });
        
        return {
          success: true,
          file: syncedFile,
          syncStatus: SYNC_STATUS.SYNCED
        };
      } catch (error) {
        log.error(`Failed to sync file: ${file.path}`, error);
        
        // Update local copy with error info
        const updatedFile = {
          ...file,
          _syncError: error.message,
          _lastSyncAttempt: new Date().getTime(),
          _pendingSync: true
        };
        
        await saveToFallbackDB(STORES.FILES, updatedFile);
        
        // Check if we should retry later
        if (file._syncAttempts < this.settings.maxRetries) {
          this.addToSyncQueue(updatedFile);
        } else {
          // Give up and notify user
          window.dispatchEvent(new CustomEvent('filesync:error', {
            detail: {
              file: updatedFile,
              error: error.message
            }
          }));
        }
        
        throw error;
      } finally {
        // Clear pending promise
        this.pendingSyncPromises.delete(file.path);
      }
    })();
    
    // Store promise for deduplication
    this.pendingSyncPromises.set(file.path, syncPromise);
    
    return syncPromise;
  }
  
  /**
   * Force sync all pending files
   * @returns {Promise<object>} - Sync results
   */
  async sync() {
    if (!this.isOnline) {
      return {
        success: false,
        message: 'Cannot sync while offline',
        pending: this.syncQueue.length
      };
    }
    
    if (this.syncQueue.length === 0) {
      // Check for any pending files in storage
      const pendingItems = await queryFallbackDB(STORES.FILES, (item) => 
        item._pendingSync || item._created_offline
      );
      
      if (pendingItems && pendingItems.length > 0) {
        this.syncQueue.push(...pendingItems);
      }
    }
    
    if (this.syncQueue.length === 0) {
      return {
        success: true,
        message: 'No files to sync',
        pending: 0
      };
    }
    
    // Process queue and wait for completion
    await this.processQueue();
    
    return {
      success: true,
      message: 'Sync complete',
      pending: this.syncQueue.length
    };
  }
  
  /**
   * Resolve a sync conflict
   * @param {string} path - File path
   * @param {string} resolution - Resolution strategy
   * @param {object} customContent - Custom merged content (for manual resolution)
   */
  async resolveConflict(path, resolution, customContent = null) {
    const file = await getFromFallbackDB(STORES.FILES, path);
    
    if (!file || !file._conflict) {
      throw new Error('No conflict found for this file');
    }
    
    const remoteFile = file._remoteVersion;
    
    if (!remoteFile) {
      throw new Error('Remote version not available');
    }
    
    let resolvedContent;
    let resolvedFile;
    
    switch (resolution) {
      case CONFLICT_RESOLUTION.LOCAL_WINS:
        resolvedContent = file.content;
        break;
        
      case CONFLICT_RESOLUTION.REMOTE_WINS:
        resolvedContent = remoteFile.content;
        break;
        
      case CONFLICT_RESOLUTION.MANUAL:
        if (!customContent) {
          throw new Error('Custom content required for manual resolution');
        }
        resolvedContent = customContent;
        break;
        
      default:
        throw new Error('Invalid resolution strategy');
    }
    
    // Save resolved content
    resolvedFile = {
      ...file,
      content: resolvedContent,
      _conflict: false,
      _remoteVersion: null,
      _pendingSync: true,
      _lastUpdated: new Date().getTime()
    };
    
    await saveToFallbackDB(STORES.FILES, resolvedFile);
    
    // Add to sync queue
    this.addToSyncQueue(resolvedFile);
    
    return {
      success: true,
      file: resolvedFile,
      syncStatus: SYNC_STATUS.PENDING
    };
  }
  
  /**
   * Get sync status for a file
   * @param {string} path - File path
   * @returns {Promise<string>} - Sync status
   */
  async getFileStatus(path) {
    if (!path) return SYNC_STATUS.ERROR;
    
    const localFile = await getFromFallbackDB(STORES.FILES, path);
    
    if (!localFile) {
      // Check if file exists remotely
      if (this.isOnline) {
        try {
          const api = await getApiClient();
          await api.loadFile(path);
          return SYNC_STATUS.REMOTE_ONLY;
        } catch (error) {
          return SYNC_STATUS.ERROR;
        }
      }
      return SYNC_STATUS.ERROR;
    }
    
    if (localFile._conflict) {
      return SYNC_STATUS.CONFLICT;
    }
    
    if (localFile._pendingSync || localFile._created_offline) {
      return SYNC_STATUS.PENDING;
    }
    
    if (localFile._syncError) {
      return SYNC_STATUS.ERROR;
    }
    
    return SYNC_STATUS.SYNCED;
  }
  
  /**
   * Clean up and disconnect
   */
  destroy() {
    this.stopSyncTimer();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.initialized = false;
  }
}

// Create singleton instance
const fileSyncManager = new FileSyncManager();

// Initialize on import
fileSyncManager.init().catch(error => {
  log.error('Failed to initialize File Sync Manager:', error);
});

export {
  fileSyncManager,
  SYNC_STATUS,
  CONFLICT_RESOLUTION
};
