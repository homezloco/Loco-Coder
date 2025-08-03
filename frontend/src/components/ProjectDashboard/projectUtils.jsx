/**
 * Project Dashboard Utility Functions with Persistence Monitoring
 *
 * Multi-tiered fallback system with performance monitoring:
 * 1. API (primary source when online)
 * 2. IndexedDB (persistent offline storage)
 * 3. localStorage (simpler persistent storage)
 * 4. sessionStorage (temporary session storage)
 * 5. Demo projects (ultimate fallback)
 */

// Import services dynamically to reduce initial load time
import * as persistenceMonitor from '../../utils/persistenceMonitor';

/**
 * Generate dynamic placeholder projects when no real data is available
 * @param {number} count - Number of placeholder projects to generate (default: 3)
 * @returns {Array} - Array of placeholder project objects
 */
export const generatePlaceholderProjects = (count = 3) => {
  const projectTemplates = [
    {
      name: 'Web Application',
      description: 'A responsive web application',
      language: 'javascript',
      type: 'frontend',
      tags: ['react', 'responsive', 'web']
    },
    {
      name: 'API Service',
      description: 'RESTful API service',
      language: 'javascript',
      type: 'backend',
      tags: ['node', 'express', 'api']
    },
    {
      name: 'Mobile App',
      description: 'Cross-platform mobile application',
      language: 'dart',
      type: 'mobile',
      tags: ['flutter', 'mobile', 'cross-platform']
    },
    {
      name: 'Data Analysis',
      description: 'Data processing and visualization',
      language: 'python',
      type: 'data',
      tags: ['pandas', 'visualization', 'analysis']
    }
  ];

  // Generate the requested number of projects
  return Array.from({ length: Math.min(count, projectTemplates.length) }, (_, index) => {
    const template = projectTemplates[index % projectTemplates.length];
    const timestamp = Date.now() - (index * 86400000); // 1 day apart
    
    return {
      id: `placeholder-${Date.now()}-${index}`,
      name: template.name,
      description: template.description,
      language: template.language,
      type: template.type,
      lastModified: new Date(timestamp).toISOString(),
      favorite: Math.random() > 0.7, // 30% chance of being a favorite
      tags: [...template.tags],
      isPlaceholder: true // Flag to identify placeholder projects
    };
  });
};

// Statistics for persistence layer monitoring
let persistenceStats = {
  apiCalls: 0,
  apiSuccesses: 0,
  idbCalls: 0,
  idbSuccesses: 0,
  lsCalls: 0,
  lsSuccesses: 0,
  ssCalls: 0,
  ssSuccesses: 0,
  fallbacksUsed: 0,
  lastUpdated: null
};

// IndexedDB service instance
let idbService = null;

// Initialize IndexedDB service
const getIndexedDBService = () => {
  if (!idbService) {
    try {
      idbService = {
        getProjects: async () => {
          persistenceStats.idbCalls++;
          // Mock implementation since this is just a demo
          const projects = localStorage.getItem('projects');
          if (projects) {
            persistenceStats.idbSuccesses++;
            return JSON.parse(projects);
          }
          return null;
        },
        saveProjects: async (projects) => {
          persistenceStats.idbCalls++;
          try {
            localStorage.setItem('projects', JSON.stringify(projects));
            persistenceStats.idbSuccesses++;
            return true;
          } catch (error) {
            console.error('Error saving to IndexedDB:', error);
            return false;
          }
        }
      };
    } catch (error) {
      console.error('Failed to initialize IndexedDB service:', error);
      return null;
    }
  }
  return idbService;
};

// Cache for API health status to minimize redundant network requests
let apiHealthCache = {
  status: null,
  timestamp: null,
  offlineUntil: null,
  consecutiveFailures: 0,
  lastError: null,
  lastSuccessfulEndpoint: null
};

// Try to load API health cache from localStorage
try {
  const cachedHealthStatus = localStorage.getItem('apiHealthCache');
  if (cachedHealthStatus) {
    try {
      const parsed = JSON.parse(cachedHealthStatus);
      if (parsed && parsed.timestamp) {
        apiHealthCache = {
          ...apiHealthCache,
          ...parsed,
          // Don't lose any defaults
          lastError: parsed.lastError || apiHealthCache.lastError,
          consecutiveFailures: parsed.consecutiveFailures || apiHealthCache.consecutiveFailures
        };
      }
    } catch (err) {
      // Silently fail if localStorage access fails
      console.warn('Failed to load API health cache from localStorage');
    }
  }
} catch (err) {
  // Silently fail if localStorage access fails
  console.warn('Failed to load API health cache from localStorage');
}

// Import the network utilities
import { checkInternetConnectivity } from './networkUtils';

// Constants for API health cache
const API_HEALTH_CACHE_TIME = 30000; // 30 seconds

/**
 * Check API health with multiple fallback mechanisms
 * @param {string} apiEndpoint - The base API URL to check
 * @param {boolean} skipCache - Whether to skip cached results
 * @param {boolean} quiet - Whether to suppress console logs
 * @returns {Object} Status object with status and message
 */
async function checkApiHealth(apiEndpoint = 'http://localhost:5000/api', skipCache = false, quiet = false) {
  const now = Date.now();
  
  // Use cached result if available and not explicitly skipped
  if (!skipCache && apiHealthCache.timestamp && (now - apiHealthCache.timestamp) < API_HEALTH_CACHE_TIME) {
    return apiHealthCache.result;
  }
  
  // If we know the API is offline and the offline period hasn't expired, return cached result
  if (apiHealthCache.offlineUntil && now < apiHealthCache.offlineUntil) {
    console.log(`API health check using cached offline status (retry in ${Math.round((apiHealthCache.offlineUntil - now)/1000)}s)`);
    return apiHealthCache.status || { status: 'offline', message: 'API is offline (cached status)' };
  }
  
  try {
    // First check if we have an internet connection at all
    const networkCheck = await checkInternetConnectivity();
    if (!networkCheck.isOnline) {
      const result = {
        status: 'offline',
        message: 'No internet connection',
        details: { error: 'Network unavailable', method: networkCheck.method }
      };
      
      // Cache result
      apiHealthCache.result = result;
      apiHealthCache.timestamp = now;
      apiHealthCache.consecutiveFailures += 1;
      
      return result;
    }
    
    // Define multiple endpoints to try in sequence
    const endpoints = [
      { name: 'main', url: `${apiEndpoint}/status` },
      { name: 'health', url: `${apiEndpoint}/health` },
      { name: 'root', url: apiEndpoint },
      { name: 'base', url: apiEndpoint.split('/api')[0] }
    ];
    
    // Fetch with timeout
    const fetchFn = (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 3000);
      
      return fetch(url, {
        ...options,
        signal: options.signal || controller.signal
      }).finally(() => clearTimeout(timeoutId));
    };
    
    // Check API health by probing status endpoint
    const checkApiHealth = async (endpoint, { quiet = false } = {}) => {
      const now = Date.now();
      try {
        // Get auth token for health check
        const token = await getAuthToken(quiet);
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Ping the status endpoint
        const response = await fetchFn(`${endpoint}/status`, { headers });
        
        // Success response
        if (response.ok) {
          // Reset health cache on success
          const healthResult = { 
            status: 'online', 
            message: 'API is online',
            statusCode: 200
          }; 
          
          // Update cache
          apiHealthCache = {
            ...apiHealthCache,
            status: healthResult,
            timestamp: now,
            offlineUntil: null,
            consecutiveFailures: 0,
            lastSuccessfulEndpoint: endpoint
          };
          
          if (!quiet) console.log('API health check succeeded');
          return healthResult;
        }
        
        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
          const healthResult = { 
            status: 'auth_required', 
            message: 'Authentication required',
            statusCode: 401
          };
          
          // Clear token if unauthorized
          if (window.api?.clearAuthToken) {
            await window.api.clearAuthToken();
          }
          
          if (!quiet) console.warn('API health check failed: Authentication required');
          return healthResult;
        }
        
        // Other non-200 response
        const healthResult = { 
          status: 'degraded', 
          message: `API responded with status: ${response.status}`,
          statusCode: response.status
        };
        
        // Update cache but don't reset failures
        apiHealthCache = {
          ...apiHealthCache,
          status: healthResult,
          timestamp: now,
        };
        
        if (!quiet) console.warn(`API health check received non-200 response: ${response.status}`);
        return healthResult;
      } catch (error) {
        if (!quiet) console.warn('Status endpoint check failed:', error.message);
        
        // All health checks failed, API is likely offline
        const offlineResult = { 
          status: 'offline', 
          message: `API is offline: ${error.message}`,
          statusCode: 0
        };
        
        // Record failure
        apiHealthCache.lastFailure = now;
        apiHealthCache.consecutiveFailures += 1;
        
        return offlineResult;
      } 
    }
    
    // Record last failure time to implement exponential backoff
    const lastFailTime = apiHealthCache.lastFailure || 0;
    const timeSinceLastFail = now - lastFailTime;
    
    // All health checks failed, API is likely offline
    const offlineResult = { status: 'offline', message: 'API is offline' };
    
    // Increment consecutive failures for exponential backoff
    apiHealthCache.consecutiveFailures += 1;
    
    // Calculate backoff time using exponential strategy (min 5s, max 5min)
    const baseOfflineTime = 5000; // 5 seconds base
    const maxOfflineTime = 300000; // 5 minutes max
    
    const backoffTime = Math.min(
      baseOfflineTime * Math.pow(1.5, apiHealthCache.consecutiveFailures),
      maxOfflineTime
    );
    
    // Cache the offline status with exponential backoff
    apiHealthCache = {
      ...apiHealthCache,
      status: offlineResult,
      lastFailure: now,
      timestamp: now,
      offlineUntil: now + backoffTime
    };
    
    // Store in localStorage for persistence across page refreshes
    try {
      localStorage.setItem('apiHealthCache', JSON.stringify({
        status: offlineResult,
        timestamp: now,
        offlineUntil: now + backoffTime,
        consecutiveFailures: apiHealthCache.consecutiveFailures
      }));
      
      // Also store a separate simpler status for other components to use
      localStorage.setItem('apiHealthStatus', JSON.stringify({
        status: offlineResult,
        timestamp: now
      }));
    } catch (err) {
      // Silently fail if localStorage access fails
    }
    
    if (!quiet) {
      console.log(`API determined to be offline, caching status for ${Math.round(backoffTime/1000)}s (attempt ${apiHealthCache.consecutiveFailures})`);
    }
    
    return offlineResult;
  } catch (error) {
    // Handle any uncaught errors in the main health check
    if (!quiet) console.error('API health check failed with error:', error);
    
    // Increment consecutive failures for exponential backoff
    apiHealthCache.consecutiveFailures += 1;
    apiHealthCache.lastError = error.message;
    
    const criticalErrorResult = { 
      status: 'error', 
      message: `API check error: ${error.message}`,
      recoverable: false
    };
    
    // Cache the error status with backoff
    const errorBackoffTime = Math.min(
      5000 * Math.pow(1.5, apiHealthCache.consecutiveFailures),
      60000 // Max 1 minute for errors
    );
    
    apiHealthCache = {
      ...apiHealthCache,
      status: criticalErrorResult,
      timestamp: now,
      offlineUntil: now + errorBackoffTime
    };
    
    return criticalErrorResult;
  }
}

/**
 * Fetch projects with comprehensive fallbacks
 * @param {string} apiEndpoint - API endpoint to fetch from
 * @param {boolean} quiet - Whether to suppress expected errors in console
 * @returns {Object} Result containing projects, source, and any errors
 */
async function fetchProjects(apiEndpoint, options = {}) {
  // Handle both apiEndpoint as string or options object
  const normalizedOptions = typeof apiEndpoint === 'object' 
    ? { ...apiEndpoint, ...options }
    : { ...options, apiEndpoint };
    
  const {
    quiet = false, 
    forceRefresh = false,
    maxRetries = 2,
    retryDelay = 1000,
    signal,
    apiEndpoint: endpoint = 'http://localhost:8000'
  } = normalizedOptions;
  
  let projects = [];
  let errorMessage = null;
  let source = null;
  let lastError = null;
  
  // Define token storage keys
  const TOKEN_KEYS = {
    storageKey: 'auth_token',
    sessionKey: 'session_token'
  };

  // Helper function to get authentication token from various sources
  const getAuthToken = async (quiet = false) => {
    try {
      // First try to get token from the global api object if available
      if (window.api && typeof window.api.getAuthToken === 'function') {
        const token = await window.api.getAuthToken(quiet);
        if (token) return token;
      }
      
      // Fall back to direct storage if not available
      const token = localStorage.getItem('auth_token') || 
                   sessionStorage.getItem('auth_token') ||
                   localStorage.getItem(TOKEN_KEYS?.storageKey) ||
                   sessionStorage.getItem(TOKEN_KEYS?.storageKey);
      
      if (!token && !quiet) {
        console.warn('No authentication token found in any storage');
      }
      return token || null;
    } catch (error) {
      console.error('Error retrieving auth token:', error);
      return null;
    }
  };
  
  // Helper function to make API request with retries
  const fetchWithRetry = async (url, options, retries = maxRetries) => {
    // Extract the signal if provided in options
    const { signal: externalSignal, ...restOptions } = options || {};
    
    for (let i = 0; i <= retries; i++) {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000);
        
        // If we have an external signal, listen for abort
        if (externalSignal) {
          externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        
        const response = await fetch(url, {
          ...restOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
          // Clear invalid token
          if (window.api?.clearAuthToken) {
            await window.api.clearAuthToken();
          }
          // Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          throw new Error('Authentication required');
        }
        
        if (response.ok) {
          return await response.json();
        }
        
        // For non-401 errors, throw to trigger retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        lastError = error;
        if (timeoutId) clearTimeout(timeoutId);
        
        // Don't retry on abort or auth errors
        if (error.name === 'AbortError' || error.message === 'Authentication required') {
          throw error;
        }
        
        // If we have retries left, wait before trying again
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
          continue;
        }
        
        throw error;
      }
    }
  };
  
  // Check if we should skip API check (e.g., offline mode)
  const skipApiCheck = options.forceOffline || 
                      (apiHealthCache.offlineUntil && Date.now() < apiHealthCache.offlineUntil);
  
  // Only attempt API call if we're not in offline mode
  if (!skipApiCheck) {
    try {
      // Check API health first
      const apiHealth = await checkApiHealth(endpoint, { quiet });
      
      if (apiHealth.status === 'online' || apiHealth.status === 'degraded') {
        persistenceStats.apiCalls++;
        
        try {
          const token = await getAuthToken();
          const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          };
          
          // Make the API request with retry logic
          const data = await fetchWithRetry(
            `${endpoint}/api/v1/projects`,
            { 
              method: 'GET',
              headers,
              credentials: 'include'
            }
          );
          
          projects = Array.isArray(data?.projects) ? data.projects : (Array.isArray(data) ? data : []);
          source = 'api';
          persistenceStats.apiSuccesses++;
          
          // Cache the successful response
          if (projects.length > 0) {
            await persistProjects(projects);
            apiHealthCache.lastSuccess = Date.now();
            return { projects, source, error: null };
          }
          
        } catch (error) {
          errorMessage = `API request failed: ${error.message}`;
          if (!quiet) console.warn(errorMessage);
          
          // Mark API as offline for a short period
          if (error.name !== 'AbortError' && !apiHealthCache.offlineUntil) {
            apiHealthCache.offlineUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
          }
        }
      } else {
        // API is offline or in error state based on health check
        errorMessage = `API unavailable: ${apiHealth.message}`;
        if (!quiet) console.warn(errorMessage);
      }
    } catch (error) {
      errorMessage = `API health check failed: ${error.message}`;
      if (!quiet) console.warn(errorMessage);
    }
  } else {
    // API is known to be offline from cache
    const now = Date.now();
    const retryTimeSeconds = Math.round((apiHealthCache.offlineUntil - now) / 1000);
    errorMessage = `API is offline (cached status). Will retry in ${retryTimeSeconds}s`;
    if (!quiet) console.log(errorMessage);
  }
  
  // Mark that we're using a fallback
  persistenceStats.fallbacksUsed++;
  
  // Try IndexedDB next
  try {
    const idb = getIndexedDBService();
    if (idb) {
      persistenceStats.idbCalls++;
      const idbProjects = await idb.getProjects();
      if (idbProjects && idbProjects.length > 0) {
        persistenceStats.idbSuccesses++;
        return {
          projects: idbProjects,
          source: 'indexeddb',
          error: errorMessage
        };
      }
    }
  } catch (error) {
    if (!quiet) console.warn('Failed to retrieve from IndexedDB:', error.message);
  }
  
  // Try localStorage next
  try {
    persistenceStats.lsCalls++;
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) {
      const parsedProjects = JSON.parse(storedProjects);
      if (parsedProjects && parsedProjects.length > 0) {
        persistenceStats.lsSuccesses++;
        return {
          projects: parsedProjects,
          source: 'localStorage',
          error: errorMessage
        };
      }
    }
  } catch (error) {
    if (!quiet) console.warn('Failed to retrieve from localStorage:', error.message);
  }
  
  // Try sessionStorage next
  try {
    persistenceStats.ssCalls++;
    const sessionProjects = sessionStorage.getItem('projects');
    if (sessionProjects) {
      const parsedProjects = JSON.parse(sessionProjects);
      if (parsedProjects && parsedProjects.length > 0) {
        persistenceStats.ssSuccesses++;
        return {
          projects: parsedProjects,
          source: 'sessionStorage',
          error: errorMessage
        };
      }
    }
  } catch (error) {
    if (!quiet) console.warn('Failed to retrieve from sessionStorage:', error.message);
  }

  // Final fallback - generate placeholder projects
  persistenceMonitor.recordFallback('toPlaceholder');
  persistenceMonitor.recordDataSource('placeholder');
  
  console.log('All persistence methods failed, generating placeholder projects');
  const placeholderProjects = generatePlaceholderProjects(3);
  
  // Try to persist the placeholder projects for future use
  try {
    await persistProjects(placeholderProjects);
  } catch (persistError) {
    console.warn('Failed to persist placeholder projects:', persistError);
  }
  
  return { 
    projects: placeholderProjects, 
    source: 'placeholder', 
    error: errorMessage || 'All persistence methods failed. Using placeholder projects.' 
  };
}

/**
 * Filter projects based on active filter
 * @param {Array} projects - Array of projects to filter
 * @param {string} activeFilter - Filter to apply
 * @returns {Array} - Filtered projects
 */
function filterProjects(projects, activeFilter) {
  if (!projects || !Array.isArray(projects)) {
    console.warn('filterProjects received invalid projects:', projects);
    return [];
  }
  
  if (!activeFilter || activeFilter === 'all') {
    return [...projects];
  } else if (activeFilter === 'favorites') {
    return projects.filter(project => project.favorite === true);
  } else if (activeFilter === 'recent') {
    // Sort by lastModified and take most recent 5
    return [...projects]
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
      .slice(0, 5);
  } else {
    // Filter by project type
    return projects.filter(project => project.type === activeFilter);
  }
}

/**
 * Search projects by name, description, or tags
 * @param {Array} projects - Array of projects to search
 * @param {string} query - Search query
 * @returns {Array} - Filtered projects matching the search query
 */
function searchProjects(projects, query) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return projects;
  }
  
  const searchTerms = query.toLowerCase().trim().split(/\s+/);
  
  return projects.filter(project => {
    const name = (project.name || '').toLowerCase();
    const description = (project.description || '').toLowerCase();
    const tags = (project.tags || []).map(tag => tag.toLowerCase());
    
    return searchTerms.some(term => 
      name.includes(term) || 
      description.includes(term) || 
      tags.some(tag => tag.includes(term))
    );
  });
}

/**
 * Persist projects to multiple storage mechanisms
 * @param {Array} projects - Array of projects to persist
 * @returns {Promise<boolean>} - True if persisted successfully to at least one storage mechanism
 */
async function persistProjects(projects) {
  if (!projects || !Array.isArray(projects)) {
    console.warn('persistProjects received invalid projects:', projects);
    return false;
  }
  
  let success = false;
  persistenceStats.lastUpdated = Date.now();
  
  // Try IndexedDB first
  try {
    const idb = getIndexedDBService();
    if (idb) {
      persistenceStats.idbCalls++;
      const idbResult = await idb.saveProjects(projects);
      if (idbResult) {
        persistenceStats.idbSuccesses++;
        success = true;
      }
    }
  } catch (error) {
    console.warn('Failed to persist to IndexedDB:', error.message);
  }
  
  // Try localStorage
  try {
    persistenceStats.lsCalls++;
    localStorage.setItem('projects', JSON.stringify(projects));
    persistenceStats.lsSuccesses++;
    success = true;
  } catch (error) {
    console.warn('Failed to persist to localStorage:', error.message);
  }
  
  // Try sessionStorage
  try {
    persistenceStats.ssCalls++;
    sessionStorage.setItem('projects', JSON.stringify(projects));
    persistenceStats.ssSuccesses++;
    success = true;
  } catch (error) {
    console.warn('Failed to persist to sessionStorage:', error.message);
  }
  
  // Also update persistence monitor
  try {
    persistenceMonitor.logPersistenceActivity('projects', success);
  } catch (error) {
    // Silently fail if monitor is not available
  }
  
  return success;
}

/**
 * Toggle favorite status for a project and persist changes
 * @param {string} projectId - ID of the project to toggle
 * @param {Array} projects - Current array of projects
 * @returns {Promise<Object>} - Updated projects array and success status
 */
async function toggleProjectFavorite(projectId, projects) {
  if (!projectId || !projects || !Array.isArray(projects)) {
    return { success: false, projects, error: 'Invalid parameters' };
  }
  
  const updatedProjects = projects.map(project => 
    project.id === projectId
      ? { ...project, favorite: !project.favorite }
      : project
  );
  
  const persistResult = await persistProjects(updatedProjects);
  
  return {
    success: persistResult,
    projects: updatedProjects,
    error: persistResult ? null : 'Failed to persist project changes'
  };
}

/**
 * Delete a project from storage
 * @param {string} projectId - ID of the project to delete
 * @param {Array} projects - Current array of projects
 * @returns {Promise<Object>} - Updated projects array and success status
 */
async function deleteProject(projectId, projects) {
  if (!projectId || !projects || !Array.isArray(projects)) {
    return { success: false, projects, error: 'Invalid parameters' };
  }
  
  // Check if trying to delete a demo project
  const isDemo = projectId.startsWith('demo');
  if (isDemo) {
    return {
      success: false,
      projects,
      error: 'Demo projects cannot be deleted'
    };
  }
  
  const updatedProjects = projects.filter(project => project.id !== projectId);
  
  if (updatedProjects.length === projects.length) {
    return {
      success: false,
      projects,
      error: `Project with ID ${projectId} not found`
    };
  }
  
  const persistResult = await persistProjects(updatedProjects);
  
  return {
    success: persistResult,
    projects: updatedProjects,
    error: persistResult ? null : 'Failed to persist project changes'
  };
}

/**
 * Get persistence monitoring statistics
 * @returns {Object} - Statistics and diagnostic information
 */
function getPersistenceStatistics() {
  return persistenceStats;
}

/**
 * Reset persistence monitoring statistics
 */
function resetPersistenceStatistics() {
  persistenceStats = {
    apiCalls: 0,
    apiSuccesses: 0,
    idbCalls: 0,
    idbSuccesses: 0,
    lsCalls: 0, 
    lsSuccesses: 0,
    ssCalls: 0,
    ssSuccesses: 0,
    fallbacksUsed: 0,
    lastUpdated: Date.now()
  };
}

/**
 * Save dashboard layout preferences with multi-tiered persistence
 * @param {Object} preferences - Layout preferences to save (order, viewMode)
 * @returns {Promise<boolean>} - True if persisted successfully to at least one storage mechanism
 */
async function saveDashboardPreferences(preferences) {
  if (!preferences || typeof preferences !== 'object') {
    console.warn('saveDashboardPreferences received invalid preferences:', preferences);
    return false;
  }
  
  let success = false;
  
  // Try localStorage first
  try {
    localStorage.setItem('dashboardPreferences', JSON.stringify(preferences));
    success = true;
  } catch (error) {
    console.warn('Failed to save dashboard preferences to localStorage:', error.message);
  }
  
  // Also try sessionStorage as backup
  try {
    sessionStorage.setItem('dashboardPreferences', JSON.stringify(preferences));
    success = true;
  } catch (error) {
    console.warn('Failed to save dashboard preferences to sessionStorage:', error.message);
  }
  
  // Try IndexedDB if available
  try {
    const idb = getIndexedDBService();
    if (idb && idb.saveDashboardPreferences) {
      await idb.saveDashboardPreferences(preferences);
      // Success already tracked
    }
  } catch (error) {
    console.warn('Failed to save dashboard preferences to IndexedDB:', error.message);
  }
  
  return success;
}

/**
 * Load dashboard layout preferences with multi-tiered fallbacks
 * @returns {Promise<Object>} - Dashboard preferences or null if not found
 */
async function loadDashboardPreferences() {
  let preferences = null;
  
  // Try IndexedDB first if available
  try {
    const idb = getIndexedDBService();
    if (idb && idb.getDashboardPreferences) {
      preferences = await idb.getDashboardPreferences();
      if (preferences) {
        return preferences;
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard preferences from IndexedDB:', error.message);
  }
  
  // Try localStorage next
  try {
    const storedPreferences = localStorage.getItem('dashboardPreferences');
    if (storedPreferences) {
      preferences = JSON.parse(storedPreferences);
      if (preferences) {
        return preferences;
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard preferences from localStorage:', error.message);
  }
  
  // Try sessionStorage last
  try {
    const sessionPreferences = sessionStorage.getItem('dashboardPreferences');
    if (sessionPreferences) {
      preferences = JSON.parse(sessionPreferences);
      if (preferences) {
        return preferences;
      }
    }
  } catch (error) {
    console.warn('Failed to load dashboard preferences from sessionStorage:', error.message);
  }
  
  // Return default preferences if nothing found
  return {
    sortOrder: 'recent',
    viewMode: 'grid',
    compactView: false,
    showDescription: true
  };
}

/**
 * Merge two arrays of projects, with the second array taking precedence
 * @param {Array} projects1 - First array of projects
 * @param {Array} projects2 - Second array of projects (takes precedence)
 * @returns {Array} - Merged array of projects
 */
function mergeProjects(projects1, projects2) {
  if (!Array.isArray(projects1) || !Array.isArray(projects2)) {
    return [];
  }
  
  const merged = [...projects1];
  
  projects2.forEach(project2 => {
    const existingIndex = merged.findIndex(p => p.id === project2.id);
    if (existingIndex >= 0) {
      // Update existing project
      merged[existingIndex] = { ...merged[existingIndex], ...project2 };
    } else {
      // Add new project
      merged.push(project2);
    }
  });
  
  return merged;
}

export {
  fetchProjects,
  persistProjects,
  searchProjects,
  mergeProjects,
  filterProjects,
  toggleProjectFavorite,
  deleteProject,
  checkApiHealth,
  getPersistenceStatistics,
  resetPersistenceStatistics,
  saveDashboardPreferences,
  loadDashboardPreferences
};
