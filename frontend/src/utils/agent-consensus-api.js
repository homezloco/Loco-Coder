/**
 * Multi-Agent Consensus API Client
 * 
 * Provides utilities for interacting with the multi-agent consensus API
 * with built-in fallback mechanisms for network issues, API failures,
 * and other potential points of failure.
 */

import { saveToFallbackDB, getFromFallbackDB } from './database-fallback';

// Cache store names
const AGENT_CACHE_STORE = 'agent_consensus_agents';
const TASK_CACHE_STORE = 'agent_consensus_tasks';
const TASK_RESULT_CACHE_STORE = 'agent_consensus_results';

// Default fallback settings - can be overridden by system settings
const DEFAULT_FALLBACK_SETTINGS = {
  cacheResults: true,           // Whether to cache API responses
  useOfflineQueue: true,        // Queue API calls when offline
  retryFailedCalls: true,       // Auto-retry failed API calls
  maxRetries: 3,                // Maximum number of retries
  retryDelay: 1000,             // Initial retry delay in ms
  retryBackoff: 1.5,            // Exponential backoff factor
  requestTimeout: 15000,        // API request timeout in ms
  useLocalFallbacks: true,      // Use local fallbacks when API fails
  persistenceEnabled: true,     // Persist task data between sessions
};

/**
 * Creates a multi-agent consensus API client
 * 
 * @param {Object} config Configuration object
 * @param {string} config.baseUrl Base URL for the API
 * @param {string} config.apiKey API key for authentication
 * @param {Object} config.fallbackSettings Fallback settings to override defaults
 * @param {Function} config.onError Error handler function
 * @param {Function} config.onOffline Offline handler function
 * @returns {Object} API client with methods for interacting with the multi-agent system
 */
export function createAgentConsensusApi({
  baseUrl = '/api',
  apiKey = '',
  fallbackSettings = {},
  onError = () => {},
  onOffline = () => {}
}) {
  // Merge default settings with provided settings
  const settings = {
    ...DEFAULT_FALLBACK_SETTINGS,
    ...fallbackSettings
  };

  // Offline request queue
  let offlineQueue = [];
  
  // In-memory response cache for ultra-fast responses
  const memoryCache = {
    agents: new Map(),
    tasks: new Map(),
    results: new Map()
  };
  
  /**
   * Core request handler with built-in fallback mechanisms
   * 
   * @param {string} endpoint API endpoint (without baseUrl)
   * @param {Object} options Fetch options
   * @param {string} cacheStore Name of the cache store for this request type
   * @param {string} cacheKey Key to use for caching
   * @param {Function} localFallbackFn Optional function to generate fallback response
   * @returns {Promise<Object>} API response data
   */
  async function makeRequest(
    endpoint,
    options = {},
    cacheStore = null,
    cacheKey = null,
    localFallbackFn = null
  ) {
    const url = `${baseUrl}${endpoint}`;
    const fetchOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
        ...(options.headers || {})
      },
      timeout: settings.requestTimeout
    };
    
    // Early return from memory cache if available for GET requests
    if (
      options.method === 'GET' &&
      cacheStore &&
      cacheKey &&
      settings.cacheResults
    ) {
      // Check memory cache first for ultra-fast response
      if (cacheStore === AGENT_CACHE_STORE && memoryCache.agents.has(cacheKey)) {
        return memoryCache.agents.get(cacheKey);
      } else if (cacheStore === TASK_CACHE_STORE && memoryCache.tasks.has(cacheKey)) {
        return memoryCache.tasks.get(cacheKey);
      } else if (cacheStore === TASK_RESULT_CACHE_STORE && memoryCache.results.has(cacheKey)) {
        return memoryCache.results.get(cacheKey);
      }
    }
    
    // If we're offline, queue the request or use fallback
    if (!navigator.onLine) {
      if (options.method !== 'GET' && settings.useOfflineQueue) {
        // Queue the request for later
        offlineQueue.push({
          endpoint,
          options,
          cacheStore,
          cacheKey,
          timestamp: Date.now()
        });
        
        // Also notify the app we're offline
        onOffline(offlineQueue.length);
        
        throw new Error('Currently offline. Request queued.');
      } else if (options.method === 'GET' && cacheStore && cacheKey && settings.useLocalFallbacks) {
        // Try to get from persistent fallback DB
        const cachedData = await getFromFallbackDB(cacheStore, cacheKey);
        if (cachedData) {
          return cachedData.value;
        }
        
        // If we have a local fallback function, use it
        if (localFallbackFn) {
          const fallbackData = localFallbackFn(endpoint, options);
          return fallbackData;
        }
        
        throw new Error('Offline and no cached data available');
      }
    }
    
    // Try to make the actual API request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), settings.requestTimeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache successful GET responses
      if (
        options.method === 'GET' &&
        cacheStore && 
        cacheKey &&
        settings.cacheResults &&
        data
      ) {
        // Cache in memory
        if (cacheStore === AGENT_CACHE_STORE) {
          memoryCache.agents.set(cacheKey, data);
        } else if (cacheStore === TASK_CACHE_STORE) {
          memoryCache.tasks.set(cacheKey, data);
        } else if (cacheStore === TASK_RESULT_CACHE_STORE) {
          memoryCache.results.set(cacheKey, data);
        }
        
        // Cache in persistent storage
        if (settings.persistenceEnabled) {
          await saveToFallbackDB(cacheStore, {
            id: cacheKey,
            value: data,
            timestamp: Date.now()
          });
        }
      }
      
      return data;
    } catch (error) {
      // Handle timeout errors
      if (error.name === 'AbortError') {
        error.message = 'Request timed out';
      }
      
      // Try automatic retry for non-GET requests
      if (
        options.method !== 'GET' &&
        settings.retryFailedCalls &&
        !error.retryCount
      ) {
        return retryRequest(endpoint, options, cacheStore, cacheKey, localFallbackFn);
      }
      
      // For GET requests, try to use cached data
      if (
        options.method === 'GET' && 
        cacheStore && 
        cacheKey && 
        settings.useLocalFallbacks
      ) {
        // Try to get from persistent fallback DB
        try {
          const cachedData = await getFromFallbackDB(cacheStore, cacheKey);
          if (cachedData) {
            return cachedData.value;
          }
        } catch (cacheError) {
          console.error('Failed to retrieve from cache:', cacheError);
        }
      }
      
      // If we have a local fallback function, use it
      if (localFallbackFn && settings.useLocalFallbacks) {
        try {
          const fallbackData = localFallbackFn(endpoint, options);
          return fallbackData;
        } catch (fallbackError) {
          console.error('Local fallback failed:', fallbackError);
        }
      }
      
      // Call the error handler
      onError(error);
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Retry a failed request with exponential backoff
   */
  async function retryRequest(endpoint, options, cacheStore, cacheKey, localFallbackFn) {
    const retries = options.retryCount || 0;
    
    if (retries >= settings.maxRetries) {
      throw new Error(`Failed after ${retries} retries`);
    }
    
    // Calculate backoff delay
    const delay = settings.retryDelay * Math.pow(settings.retryBackoff, retries);
    
    // Wait for the backoff period
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Try again with incremented retry count
    return makeRequest(
      endpoint,
      { ...options, retryCount: retries + 1 },
      cacheStore,
      cacheKey,
      localFallbackFn
    );
  }
  
  /**
   * Process the offline request queue
   * Returns the number of successful requests
   */
  async function processOfflineQueue() {
    if (offlineQueue.length === 0 || !navigator.onLine) {
      return 0;
    }
    
    let successCount = 0;
    const currentQueue = [...offlineQueue];
    offlineQueue = [];
    
    for (const request of currentQueue) {
      try {
        await makeRequest(
          request.endpoint,
          request.options,
          request.cacheStore,
          request.cacheKey
        );
        successCount++;
      } catch (error) {
        console.error('Failed to process offline request:', error);
        
        // Put back in the queue if not too old (24 hours)
        const ageHours = (Date.now() - request.timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) {
          offlineQueue.push(request);
        }
      }
    }
    
    return successCount;
  }
  
  /**
   * Set up online/offline event listeners
   */
  function setupNetworkListeners() {
    window.addEventListener('online', async () => {
      const processed = await processOfflineQueue();
      if (processed > 0) {
        console.log(`Processed ${processed} queued requests`);
      }
    });
    
    window.addEventListener('offline', () => {
      onOffline(offlineQueue.length);
    });
  }
  
  // Initialize network listeners
  setupNetworkListeners();
  
  // API Client methods
  return {
    /**
     * Get the list of registered agents
     */
    async getAgents() {
      return makeRequest(
        '/agents/list',
        { method: 'GET' },
        AGENT_CACHE_STORE,
        'agent_list',
        () => ({ agents: [] }) // Local fallback returns empty array
      );
    },
    
    /**
     * Register a new agent
     * 
     * @param {Object} agentData Agent configuration data
     */
    async registerAgent(agentData) {
      const response = await makeRequest(
        '/agents/register',
        {
          method: 'POST',
          body: JSON.stringify(agentData)
        }
      );
      
      // Invalidate agents cache
      memoryCache.agents.delete('agent_list');
      
      return response;
    },
    
    /**
     * Delete a registered agent
     * 
     * @param {string} agentId Agent ID to delete
     */
    async deleteAgent(agentId) {
      const response = await makeRequest(
        `/agents/${agentId}`,
        { method: 'DELETE' }
      );
      
      // Invalidate agents cache
      memoryCache.agents.delete('agent_list');
      
      return response;
    },
    
    /**
     * Create a new task for multiple agents with consensus
     * 
     * @param {Object} taskData Task configuration data
     */
    async createTask(taskData) {
      return makeRequest(
        '/agents/tasks',
        {
          method: 'POST',
          body: JSON.stringify(taskData)
        }
      );
    },
    
    /**
     * Get task details including status and result
     * 
     * @param {string} taskId Task ID to retrieve
     */
    async getTask(taskId) {
      return makeRequest(
        `/agents/tasks/${taskId}`,
        { method: 'GET' },
        TASK_CACHE_STORE,
        `task_${taskId}`,
        (endpoint) => {
          // Local fallback - generate a placeholder response
          const id = endpoint.split('/').pop();
          return {
            task_id: id,
            status: 'unknown',
            description: 'Task data unavailable (offline)',
            created_at: Date.now() / 1000,
            agent_count: 0,
            consensus_strategy: 'unknown',
            result: null
          };
        }
      );
    },
    
    /**
     * Get task result if available
     * 
     * @param {string} taskId Task ID to retrieve result for
     */
    async getTaskResult(taskId) {
      return makeRequest(
        `/agents/tasks/${taskId}/result`,
        { method: 'GET' },
        TASK_RESULT_CACHE_STORE,
        `result_${taskId}`,
        () => null // Local fallback returns null for results
      );
    },
    
    /**
     * Retry a failed task
     * 
     * @param {string} taskId Task ID to retry
     */
    async retryTask(taskId) {
      return makeRequest(
        `/agents/tasks/${taskId}/retry`,
        { method: 'POST' }
      );
    },
    
    /**
     * Check health of the multi-agent system
     */
    async checkHealth() {
      return makeRequest(
        '/agents/health',
        { method: 'GET' }
      );
    },
    
    /**
     * Process any queued offline requests
     * Returns the number of successfully processed requests
     */
    async processQueue() {
      return processOfflineQueue();
    },
    
    /**
     * Get the number of queued offline requests
     */
    getQueueLength() {
      return offlineQueue.length;
    },
    
    /**
     * Clear cached data for testing or troubleshooting
     * 
     * @param {string} type Optional cache type to clear ('agents', 'tasks', 'results', or 'all')
     */
    clearCache(type = 'all') {
      if (type === 'all' || type === 'agents') {
        memoryCache.agents.clear();
      }
      
      if (type === 'all' || type === 'tasks') {
        memoryCache.tasks.clear();
      }
      
      if (type === 'all' || type === 'results') {
        memoryCache.results.clear();
      }
    }
  };
}

/**
 * Singleton instance of the agent consensus API
 */
let globalApiInstance = null;

/**
 * Get the global agent consensus API instance
 * Creates a new instance if one doesn't exist
 * 
 * @param {Object} config Optional configuration to override defaults
 */
export function getAgentConsensusApi(config = {}) {
  if (!globalApiInstance) {
    globalApiInstance = createAgentConsensusApi(config);
  }
  return globalApiInstance;
}

export default getAgentConsensusApi;
